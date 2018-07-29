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
}

Client.prototype.isClickable = function() {
    var cur = new Date();
    var _auth = this.socket.request.session.username ? this.socket.request.session.auth : -1;
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
    var _auth = this.socket.request.session.username ? this.socket.request.session.auth : -1;
    if( _auth >= 1 ) {
        return true;
    }
    else if ( _auth == 0 ) {
        return (cur - this.tLastClick) > 500;
    }

    return (cur - this.tLastClick) > 10 * 1000;
}

Client.prototype.isAdmin = function() {
    return this.auth >= 50;
}

Client.prototype.isLogined = function() {
    var socket = this.socket;
    var logined = socket.request.session.username ? true : false;
    return logined;
}

module.exports = Client;