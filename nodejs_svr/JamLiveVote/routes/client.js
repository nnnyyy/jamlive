/**
 * Created by nnnyy on 2018-05-10.
 */
var Client = function(socket) {
    this.socket = socket;
    this.tLastClick = 0;
    this.activePoint = 0;
    this.auth = -1;
    this.nick = '';
    this.ip = '';
    this.tLastChat = 0;
}

Client.prototype.isClickable = function() {
    var cur = new Date();
    var _auth = this.socket.handshake.session.username ? this.socket.handshake.session.auth : -1;
    if( _auth >= 1 ) {
        return (cur - this.tLastClick) > 1000;
    }
    else if ( _auth == 0 ) {
        return (cur - this.tLastClick) > 3500;
    }

    return (cur - this.tLastClick) > 7000;
}

Client.prototype.isSearchable = function() {
    var cur = new Date();
    var _auth = this.socket.handshake.session.username ? this.socket.handshake.session.auth : -1;
    if( _auth >= 1 ) {
        return true;
    }
    else if ( _auth == 0 ) {
        return (cur - this.tLastClick) > 500;
    }

    return (cur - this.tLastClick) > 10 * 1000;
}

Client.prototype.getUserId = function() {
    return this.socket.handshake.session.username;
}

Client.prototype.isAdmin = function() {
    return this.auth >= 50;
}

Client.prototype.isLogined = function() {
    var socket = this.socket;
    var logined = socket.handshake.session.username ? true : false;
    return logined;
}

Client.prototype.isAbleChat = function() {
    const tCur = new Date();
    return (tCur - this.tLastChat >= 950);
}

module.exports = Client;