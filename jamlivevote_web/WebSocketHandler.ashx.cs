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
    public class WebSocketHandler : HttpTaskAsyncHandler
    {
        static readonly int AccumlativeSec = 10;
        static readonly int CooldownSec = 1;
        static readonly int SendIntervalMilliSec = 500;

        static Devcat.Core.Threading.JobProcessor LogicThread;
        static Dictionary<int, WebSocket> WebSocketDic = new Dictionary<int, WebSocket>();
        static Dictionary<int, long> LastClickTimeDic = new Dictionary<int, long>();
        static Dictionary<long, Dictionary<string, int>> TimeSeriesCountDic = new Dictionary<long, Dictionary<string, int>>();

        static WebSocketHandler()
        {
            LogicThread = new Devcat.Core.Threading.JobProcessor();
            LogicThread.Start();
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

            while (webSocket.State != WebSocketState.Closed)
            {
                if (WebSocketDic.ContainsKey(webSocketKey) == false)
                {
                    WebSocketDic.Add(webSocketKey, webSocket);
                    RegisterSchedule(webSocket);
                }

                var buffer = new ArraySegment<byte>(new byte[1024]);
                var webSocketReceiveResult = await webSocket.ReceiveAsync(buffer, CancellationToken.None);

                if (webSocketReceiveResult.MessageType == WebSocketMessageType.Close)
                {
                    WebSocketDic.Remove(webSocketKey);
                    await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, String.Empty, CancellationToken.None);
                }
                else if (webSocketReceiveResult.MessageType == WebSocketMessageType.Text)
                {
                    var message = Encoding.UTF8.GetString(buffer.Array, 0, webSocketReceiveResult.Count);
                    var job = Devcat.Core.Threading.Job.Create(() => { ProcessMessage(webSocket, message); });
                    Devcat.Core.Threading.Scheduler.Schedule(LogicThread, job, 0);
                }
            }
        }

        private void RegisterSchedule(WebSocket webSocket)
        {
            Devcat.Core.Threading.Scheduler.Schedule(LogicThread, Devcat.Core.Threading.Job.Create(() =>
            {
                if (webSocket.State != WebSocketState.Closed)
                {
                    var task = SendMessageAsync(webSocket, GetCountMessage());
                    RegisterSchedule(webSocket);
                }
            }), SendIntervalMilliSec);
        }

        private void ProcessMessage(WebSocket webSocket, string message)
        {
            Task task;

            try
            {
                var now = DateTime.Now.ToYYYYMMDDHHMMSS();
                var clientID = webSocket.GetHashCode();
                var clickIndex = message;

                if (LastClickTimeDic.ContainsKey(clientID) && LastClickTimeDic[clientID] + CooldownSec >= now)
                {
                    return;
                }
                LastClickTimeDic[clientID] = now;

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

                task = SendMessageAsync(webSocket, GetCountMessage());
            }
            catch (Exception e)
            {
                task = SendMessageAsync(webSocket, e.Message);
            }
        }

        private string GetCountMessage()
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

            return JsonConvert.SerializeObject(dic.OrderBy(x => x.Key));
        }

        private async Task SendMessageAsync(WebSocket webSocket, string message)
        {
            await webSocket.SendAsync(
                new ArraySegment<byte>(Encoding.UTF8.GetBytes(message)),
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
