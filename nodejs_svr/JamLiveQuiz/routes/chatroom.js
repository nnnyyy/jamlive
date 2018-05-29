/**
 * Created by nnnyyy on 2018-05-16.
 */
var HashMap = require('hashmap');
var ChatRoom = function(io) {
    this.io = io;
    this.socketmap = new HashMap();
}

ChatRoom.prototype.enter = function(clientSock, nickname) {
    this.socketmap.set(clientSock, nickname);
    clientSock.join('chatroom members');
    this.io.to('chatroom members').emit('enter', {msg: nickname + '님이 구원투수로 등장!'});
}

ChatRoom.prototype.leave = function(clientSock) {
    var nickname = this.socketmap.get(clientSock);
    clientSock.broadcast.to('chatroom members').emit('leave', {msg: nickname + '님이 아쉽게도 퇴장'})
    clientSock.leave('chatroom members');
}

module.exports = ChatRoom;