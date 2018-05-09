using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

using System.Web.WebSockets;
using System.Net.WebSockets;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Concurrent;

namespace MabiWebSocket
{
    public class WebSocketHandler : HttpTaskAsyncHandler
    {
        public static IDictionary<string, WebSocket> Sockets = new Dictionary<string, WebSocket>();
        public override bool IsReusable
        {
            get
            {
                return false;
            }
        }

        //Socket Object, Although i have created a Static Dictionary of Scoket objects just to show the sample working. What i do is create this Socket object for each user and 
        //keeps it into the dictionary. You can obviously change the implementation in real time.
        private WebSocket Socket { get; set; }

        //Overriden menthod Process Request async/await featur has been used.
        public override async Task ProcessRequestAsync(HttpContext httpContext)
        {
            //task is executed
            await Task.Run(() =>
            {
                //Checks if it is a Web Socket Request
                if (httpContext.IsWebSocketRequest)
                {
                    httpContext.AcceptWebSocketRequest(async delegate (AspNetWebSocketContext aspNetWebSocketContext)
                    {
                        Socket = aspNetWebSocketContext.WebSocket;

                        //Checks if the connection is not already closed
                        while (Socket != null || Socket.State != WebSocketState.Closed)
                        {
                            //Recieves the message from client
                            ArraySegment<byte> buffer = new ArraySegment<byte>(new byte[1024]);
                            WebSocketReceiveResult webSocketReceiveResult = await Socket.ReceiveAsync(buffer, CancellationToken.None);

                            //Here i have handled the case of text based communication, you can also put down your hode to handle byte arrays etc.
                            switch (webSocketReceiveResult.MessageType)
                            {
                                case WebSocketMessageType.Text:
                                    OnMessageReceived(Encoding.UTF8.GetString(buffer.Array, 0, webSocketReceiveResult.Count));
                                    break;
                            }
                        }
                    });
                }
            });
        }

        //Sends message to the client
        private async Task SendMessageAsync(string message, WebSocket socket)
        {
            await SendMessageAsync(Encoding.UTF8.GetBytes(message), socket);
        }

        //Sends the message to the client
        private async Task SendMessageAsync(byte[] message, WebSocket socket)
        {
            await socket.SendAsync(
                new ArraySegment<byte>(message),
                WebSocketMessageType.Text,
                true,
                CancellationToken.None);
        }

        //This message is fired and parent can forget about this, what this method do is gets the message and push it to the different clients which are connected
        protected void OnMessageReceived(string message)
        {
            Task task;

            if (message.IndexOf("JOINEDSAMPLECHAT") == 0)
            {
                Sockets[message.Replace("JOINEDSAMPLECHAT:", string.Empty)] = Socket;
                foreach (string key in Sockets.Keys)
                {
                    task = SendMessageAsync(string.Concat(message.Replace("JOINEDSAMPLECHAT:", string.Empty), " Joined Chat."), Sockets[key]);
                }
            }
            else
            {
                if (message.IndexOf("BROADCAST") == 0)
                {
                    foreach (string key in Sockets.Keys)
                    {
                        task = SendMessageAsync(message.Replace("BROADCAST:", string.Empty), Sockets[key]);
                    }
                }
            }
        }
    }
}
