var ChatMan =  function() {
   this.log = [];
}

ChatMan.prototype.Broadcast = function( io, client, mode, msg, baned, voteidx ) {
    const jsondata = {sockid: client.socket.id, nickname: client.nick, msg: msg, mode: mode, isBaned: baned, admin: client.isAdmin(), isLogin: client.isLogined(), auth: client.auth, ip: client.ip, vote: voteidx };
    io.sockets.emit('chat', jsondata);
}

ChatMan.prototype.Notice = function( io, client, msg ) {
    io.sockets.emit('chat', { id: client.socket.id, nickname: '알림', msg: msg , mode: "notice", isBaned: false, admin: false, auth: 99 });
}

module.exports = new ChatMan();