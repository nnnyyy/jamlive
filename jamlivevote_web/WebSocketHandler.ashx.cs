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
    internal class ClickCountMessage
    {
        public long Time { get; set; }
        public Dictionary<string, int> Count { get; set; }
    }

    public class WebSocketHandler : HttpTaskAsyncHandler
    {
        static readonly int AccumlativeSec = 10;
        static readonly int CooldownSec = 1;

        static Dictionary<int, WebSocket> WebSocketDic = new Dictionary<int, WebSocket>();
        static Dictionary<int, long> LastClickTimeDic = new Dictionary<int, long>();
        static Dictionary<long, Dictionary<string, int>> TimeSeriesCountDic = new Dictionary<long, Dictionary<string, int>>();

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
                WebSocketDic[webSocketKey] = webSocket;

                ArraySegment<byte> buffer = new ArraySegment<byte>(new byte[1024]);
                WebSocketReceiveResult webSocketReceiveResult = await webSocket.ReceiveAsync(buffer, CancellationToken.None);

                if (webSocketReceiveResult.MessageType == WebSocketMessageType.Close)
                {
                    WebSocketDic.Remove(webSocketKey);

                    await webSocket.CloseAsync(WebSocketCloseStatus.NormalClosure, String.Empty, CancellationToken.None);
                }
                else if (webSocketReceiveResult.MessageType == WebSocketMessageType.Text)
                {
                    ProcessMessage(webSocket, Encoding.UTF8.GetString(buffer.Array, 0, webSocketReceiveResult.Count));
                }
            }
        }

        protected void ProcessMessage(WebSocket webSocket, string message)
        {
            try
            {
                var webSocketKey = webSocket.GetHashCode();
                var clickCountKey = message;
                var now = DateTime.Now.ToYYYYMMDDHHMMSS();

                if (LastClickTimeDic.ContainsKey(webSocketKey) && LastClickTimeDic[webSocketKey] + CooldownSec >= now)
                {
                    return;
                }
                LastClickTimeDic[webSocketKey] = now;

                if (TimeSeriesCountDic.ContainsKey(now))
                {
                    TimeSeriesCountDic[now].AddOrIncrease(clickCountKey, 1);
                }
                else
                {
                    TimeSeriesCountDic.Add(now, new Dictionary<string, int>() { { clickCountKey, 1 } } );

                    var skipCount = TimeSeriesCountDic.Count() - AccumlativeSec;
                    if (skipCount > 0)
                    {
                        TimeSeriesCountDic = TimeSeriesCountDic.OrderBy(x => x.Key).Skip(skipCount).ToDictionary(x => x.Key, x => x.Value);
                    }
                }

                BroadcastClickCount();
            }
            catch (Exception e)
            {
                var task = SendMessageAsync(webSocket, e.ToString());
            }
        }

        private void BroadcastClickCount()
        {
            if (TimeSeriesCountDic.Count() > 0)
            {
                var dic = new Dictionary<string, int>();

                foreach (var clickCountDic in TimeSeriesCountDic.Values)
                {
                    foreach (var pair in clickCountDic)
                    {
                        dic.AddOrIncrease(pair.Key, pair.Value);
                    }
                }

                var message = JsonConvert.SerializeObject(new ClickCountMessage()
                {
                    Time = TimeSeriesCountDic.Keys.OrderBy(x => x).Last(),
                    Count = dic.OrderBy(x => x.Key).ToDictionary(x => x.Key, x => x.Value)
                });

                foreach (var webSocket in WebSocketDic.Values)
                {
                    var task = SendMessageAsync(webSocket, message);
                }
            }
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
