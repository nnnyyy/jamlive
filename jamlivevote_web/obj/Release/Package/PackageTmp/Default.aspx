<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>Web Socket Sample</title>
    <script type="text/javascript">

        var webSocket;
        var username;

        //Check is made if the WebSocket are supported on the browser or not and if they are supported then connection is established. As this is the sample i have created the 
        //connection here on page load but you can also create the connection on click of the join button.
        function WebSocketTest() {
            if ("WebSocket" in window) {
                //webSocket = new WebSocket("ws://push.mabinogi.nexon.com/default.Socket");
                webSocket = new WebSocket("ws://push.mabinogi.nexon.com/WebSocketHandler.ashx");
                webSocket.onopen = function () {
                    //Connection Opened, if you want to do something while opening connection do it here
                };
            }
            else {
                alert("WebSocket NOT supported by your Browser!");
            }
        }

        WebSocketTest();

        //When user joins in by clicking in Join button, Message is sent to the server that the user joined in which is broadcasted for every user
        function JoinUser() {
            username = document.getElementById('txtUserName').value;
            var joinButton = document.getElementById('btnJoin');
            webSocket.send("JOINEDSAMPLECHAT:" + username);
            username.disabled = true;
            joinButton.disabled = true;
        }

        //When the user writes it any message it is broadcasted to every user.
        function SendMessage() {
            var message = document.getElementById('txtMessage').value;
            webSocket.send("BROADCAST:" + username + ": " + message);
        }

        //Fired when message is recieved from the server and displays it in the user window.
        webSocket.onmessage = function (evt) {
            var messages = document.getElementById('divMessages');
            var received_msg = evt.data;
            messages.innerHTML = messages.innerHTML + received_msg + '</br>';
        };

        //fired when the connection gets closed
        webSocket.onclose = function () {
            alert("Connection is closed");
        };

        //Fired when there comes some error in the web socket connection
        webSocket.onerror = function(error)
        {
            alert(error.data);
        };

    </script>

</head>
<body>
    Username:
    <input type="text" id="txtUserName" />&nbsp;<input type="button" id="btnJoin" value="Join" onclick="JoinUser();" /><br />
    Message:
    <input type="text" id="txtMessage" />&nbsp;<input type="button" id="btnBroadcaseMessage" value="Broadcast" onclick="SendMessage();" /><br />
    <div id="divMessages">
    </div>
</body>
</html>
