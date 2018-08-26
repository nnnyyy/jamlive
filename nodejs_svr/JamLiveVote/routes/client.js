/**
 * Created by nnnyy on 2018-05-10.
 */
var Client = function(socket) {
    this.socket = socket;
    this.tLastClick = 0;
    this.auth = -1;
    this.nick = '';
    this.ip = '';
    this.tLastChat = 0;
    this.tLastSearch = 0;
}

Client.prototype.isClickable = function() {
    var cur = new Date();
    var _auth = this.socket.handshake.session.username ? this.socket.handshake.session.userinfo.auth : -1;
    if( _auth >= 3 ) {
        return (cur - this.tLastClick) > 3000;
    }
    else if ( _auth == 0 ) {
        return (cur - this.tLastClick) > 5000;
    }

    return (cur - this.tLastClick) > 7000;
}

Client.prototype.isInSearchedUser = function() {
    var tCur = new Date();
    return tCur - this.tLastSearch <= ( 8 * 1000 );
}

Client.prototype.isHighLevelUser = function() {
    return this.auth >= 4;
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

Client.prototype.incActivePoint = function( point ) {
    if( !this.isLogined() ) return;

    this.socket.handshake.session.userinfo.ap += point;
    if( this.socket.handshake.session.userinfo.ap <= 0 ) {
        this.socket.handshake.session.userinfo.ap = 0;
    }
}

Client.prototype.getActivePoint = function() {
    if( !this.isLogined() ) return 0;
    return this.socket.handshake.session.userinfo.ap;
}

module.exports = Client;