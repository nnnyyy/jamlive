using System;
using System.Collections.Generic;
using System.Net.WebSockets;
using System.Text;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Web;
using System.Web.WebSockets;
using Newtonsoft.Json;

namespace WebSocketDemo
{
    public static class Packet
    {
        public static readonly string RECEIVE_CLICK = "CLICK";
        public static readonly string RECEIVE_JOIN = "JOIN";
        public static readonly string RECEIVE_CHAT = "CHAT";

        public static readonly string SEND_CLICKCOUNT = "CLICKCOUNT";
        public static readonly string SEND_USERCOUNT = "USERCOUNT";
        public static readonly string SEND_ENTER = "ENTER";
        public static readonly string SEND_LEAVE = "LEAVE";
        public static readonly string SEND_CHAT = "CHAT";
    }

    public class Client
    {
        public WebSocket WebSocket { get; set; }
        public string UserName { get; set; }
    }

    public class WebSocketHandler : HttpTaskAsyncHandler
    {
        static readonly int AccumlativeSec = 10;
        static readonly int SendIntervalMilliSec = 500;

        static Devcat.Core.Threading.JobProcessor LogicThread;
        static Dictionary<int, Client> ClientDic = new Dictionary<int, Client>();
        static Dictionary<long, Dictionary<string, int>> TimeSeriesCountDic = new Dictionary<long, Dictionary<string, int>>();

        private static Random Rand;

        static WebSocketHandler()
        {
            LogicThread = new Devcat.Core.Threading.JobProcessor();
            LogicThread.Start();

            Rand = new Random((int)DateTime.Now.Ticks);
        }

        public override bool IsReusable
        {
            get
            {
                return false;
            }
        }

        public override async Task ProcessRequestAsync(HttpContext httpContext)
        {
            await Task.Run(() =>
            {
                if (httpContext.IsWebSocketRequest)
                {
                    httpContext.AcceptWebSocketRequest(WebSocketRequestHandler);
                }
            });
        }

        private async Task WebSocketRequestHandler(AspNetWebSocketContext aspNetWebSocketContext)
        {
            var webSocket = aspNetWebSocketContext.WebSocket;
            var webSocketKey = webSocket.GetHashCode();

            EnterUser(webSocket);

            while (webSocket.State != WebSocketState.Closed)
            {
                var buffer = new ArraySegment<byte>(new byte[1024]);
                var webSocketReceiveResult = await webSocket.ReceiveAsync(buffer, CancellationToken.None);
                if (webSocketReceiveResult.MessageType == WebSocketMessageType.Close)
                {
                    break;
                }
                else if (webSocketReceiveResult.MessageType == WebSocketMessageType.Text)
                {
                    var message = Encoding.UTF8.GetString(buffer.Array, 0, webSocketReceiveResult.Count);
                    var job = Devcat.Core.Threading.Job.Create(() => { ProcessMessage(webSocket, message); });
                    Devcat.Core.Threading.Scheduler.Schedule(LogicThread, job, 0);
                }
            }

            LeaveUser(webSocket);
            await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, String.Empty, CancellationToken.None);
        }

        private void EnterUser(WebSocket webSocket)
        {
            Devcat.Core.Threading.Scheduler.Schedule(LogicThread, Devcat.Core.Threading.Job.Create(() =>
            {
                var addedClient = TryAddClient(webSocket);
                if (addedClient != null)
                {
                    RegisterSchedule(webSocket);

                    var enterMessage = CreateEnterMessage(addedClient.UserName);
                    Broadcast(enterMessage);
                }
            }), 0);
        }

        private void LeaveUser(WebSocket webSocket)
        {
            Devcat.Core.Threading.Scheduler.Schedule(LogicThread, Devcat.Core.Threading.Job.Create(() =>
            {
                var removedClient = RemoveClient(webSocket);
                if (removedClient != null)
                {
                    var leaveMessage = CreateLeaveMessage(removedClient.UserName);
                    Broadcast(leaveMessage);
                }
            }), 0);
        }

        private void RegisterSchedule(WebSocket webSocket)
        {
            Devcat.Core.Threading.Scheduler.Schedule(LogicThread, Devcat.Core.Threading.Job.Create(() =>
            {
                if (webSocket.State != WebSocketState.Closed)
                {
                    SendMessage(webSocket, CreateClickCountMessage());
                    SendMessage(webSocket, CreateUserCountMessage());
                    RegisterSchedule(webSocket);
                }
            }), SendIntervalMilliSec);
        }

        private Client TryAddClient(WebSocket webSocket)
        {
            if (GetClient(webSocket) == null)
            {
                var client = new Client() { WebSocket = webSocket, UserName = GetRandomString(5) };
                ClientDic.Add(webSocket.GetHashCode(), client);
                return client;
            }
            return null;
        }

        private Client RemoveClient(WebSocket webSocket)
        {
            var client = GetClient(webSocket);
            if (client != null)
            {
                ClientDic.Remove(webSocket.GetHashCode());
                return client;
            }
            return null;
        }

        private Client GetClient(WebSocket webSocket)
        {
            if (webSocket != null)
            {
                Client client;
                if (ClientDic.TryGetValue(webSocket.GetHashCode(), out client))
                {
                    return client;
                }
            }
            return null;
        }

        private string GetRandomString(int length)
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            return new string(Enumerable.Repeat(chars, length).Select(s => s[Rand.Next(s.Length)]).ToArray());
        }

        private void ProcessMessage(WebSocket webSocket, string message)
        {
            try
            {
                var client = GetClient(webSocket);
                if (client == null)
                {
                    return;
                }

                var index = message.IndexOf(":");
                if (index == -1)
                {
                    return;
                }

                var packetType = message.Substring(0, index);
                var packetMessage = message.Substring(index + 1, message.Length - index - 1);

                if (string.IsNullOrEmpty(packetType))
                {
                    return;
                }
                else if (string.Compare(packetType, Packet.RECEIVE_CLICK, StringComparison.CurrentCultureIgnoreCase) == 0)
                {
                    ProcessClick(client, packetMessage);
                }
                else if (string.Compare(packetType, Packet.RECEIVE_JOIN, StringComparison.CurrentCultureIgnoreCase) == 0)
                {
                    ProcessJoin(client, packetMessage);
                }
                else if (string.Compare(packetType, Packet.RECEIVE_CHAT, StringComparison.CurrentCultureIgnoreCase) == 0)
                {
                    ProcessChat(client, packetMessage);
                }
            }
            catch (Exception)
            {
                // bypass
            }
        }

        private void ProcessClick(Client client, string message)
        {
            var now = DateTime.Now.ToYYYYMMDDHHMMSS();
            var clickIndex = message;

            if (TimeSeriesCountDic.ContainsKey(now))
            {
                TimeSeriesCountDic[now].AddOrIncrease(clickIndex, 1);
            }
            else
            {
                TimeSeriesCountDic.Add(now, new Dictionary<string, int>() { { clickIndex, 1 } });

                var skipCount = TimeSeriesCountDic.Count() - AccumlativeSec;
                if (skipCount > 0)
                {
                    TimeSeriesCountDic = TimeSeriesCountDic.OrderBy(x => x.Key).Skip(skipCount).ToDictionary(x => x.Key, x => x.Value);
                }
            }
        }

        private void ProcessJoin(Client client, string message)
        {
            client.UserName = message;
        }

        private void ProcessChat(Client client, string message)
        {
            var chatMessage = CreateChatMessage(client.UserName, message);
            Broadcast(chatMessage);
        }

        private string CreateMessage(string packetType, string packetMessage)
        {
            return string.Format("{0}:{1}", packetType, packetMessage);
        }

        private string CreateClickCountMessage()
        {
            var now = DateTime.Now.ToYYYYMMDDHHMMSS();
            var dic = new Dictionary<string, int>();

            foreach (var clickCountDic in TimeSeriesCountDic.Where(x => x.Key > now - AccumlativeSec))
            {
                foreach (var pair in clickCountDic.Value)
                {
                    dic.AddOrIncrease(pair.Key, pair.Value);
                }
            }

            var jsonString = JsonConvert.SerializeObject(dic.OrderBy(x => x.Key));
            return CreateMessage(Packet.SEND_CLICKCOUNT, jsonString);
        }

        private string CreateUserCountMessage()
        {
            var jsonString = JsonConvert.SerializeObject(ClientDic.Count());
            return CreateMessage(Packet.SEND_USERCOUNT, jsonString);
        }

        private string CreateEnterMessage(string userName)
        {
            var jsonString = JsonConvert.SerializeObject(new Dictionary<string, string>()
            {
                { "USERNAME", userName }
            });
            return CreateMessage(Packet.SEND_ENTER, userName);
        }

        private string CreateLeaveMessage(string userName)
        {
            var jsonString = JsonConvert.SerializeObject(new Dictionary<string, string>()
            {
                { "USERNAME", userName }
            });
            return CreateMessage(Packet.SEND_LEAVE, userName);
        }

        private string CreateChatMessage(string userName, string chatMessage)
        {
            var jsonString = JsonConvert.SerializeObject(new Dictionary<string, string>()
            {
                { "USERNAME", userName }, { "MESSAGE", chatMessage }
            });
            return CreateMessage(Packet.SEND_CHAT, jsonString);
        }

        private void Broadcast(string message)
        {
            foreach (var client in ClientDic.Values)
            {
                SendMessage(client.WebSocket, message);
            }
        }

        private void SendMessage(WebSocket webSocket, string message)
        {
            var task = SendMessageAsync(webSocket, Encoding.UTF8.GetBytes(message));
        }

        private async Task SendMessageAsync(WebSocket webSocket, byte[] message)
        {
            await webSocket.SendAsync(
                new ArraySegment<byte>(message),
                WebSocketMessageType.Text,
                true,
                CancellationToken.None);
        }
    }

    static class Extension
    {
        public static long ToYYYYMMDDHHMMSS(this DateTime time)
        {
            return Convert.ToInt64(time.ToString("yyyyMMddHHmmss"));
        }

        public static void AddOrIncrease<T>(this Dictionary<T, int> dic, T key, int value)
        {
            if (dic.ContainsKey(key))
            {
                dic[key] += value;
            }
            else
            {
                dic.Add(key, value);
            }
        }
    }
}
