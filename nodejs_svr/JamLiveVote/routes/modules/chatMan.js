var ChatMan =  function() {
    this.log = [];
    this.tFreeze = 0;
}

ChatMan.prototype.Broadcast = function( io, client, mode, msg, baned, voteidx ) {
    const tCur = new Date();
    const sTime = tCur.toTimeString().split(' ')[0];
    const jsondata = {
        sockid: client.socket.id,
        nickname: client.nick,
        msg: msg,
        mode: mode,
        isBaned: baned,
        admin: client.isAdmin(),
        auth: client.auth,
        ip: client.ip,
        vote: voteidx ? voteidx : client.getLastVote(tCur),
        isSearched: client.isInSearchedUser(),
        time: sTime };
    io.sockets.in('auth').emit('chat', jsondata);
}

ChatMan.prototype.Notice = function( io, client, msg ) {
    io.sockets.in('auth').emit('chat', { id: client.socket.id, nickname: '알림', msg: msg , mode: "notice", isBaned: false, admin: false, auth: 99 });
}

ChatMan.prototype.BroadcastAdminMsg = function( io, msg ) {
    io.sockets.in('auth').emit('admin-msg', {msg: msg});
}

ChatMan.prototype.isFreeze = function(tCur) {
    return (tCur - this.tFreeze <= 3 * 60 * 1000);
}

ChatMan.prototype.setFreeze = function() {
    this.tFreeze = new Date();
}

module.exports = new ChatMan();