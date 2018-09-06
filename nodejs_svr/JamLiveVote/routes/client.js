/**
 * Created by nnnyy on 2018-05-10.
 */
const LevelExpTable = require('./modules/LevelExpTable');
const dbhelper = require('./dbhelper');

var Client = function(servman, socket) {
    this.servman = servman;
    this.socket = socket;
    this.tLastClick = 0;
    this.auth = -1;
    this.nick = '';
    this.ip = '';
    this.tLastChat = 0;
    this.tLastSearch = 0;
}

Client.prototype.getBanCnt = function() {
    if( this.isLogined() ) {
        return this.socket.handshake.session.userinfo.banCnt;
    }
    else {
        return 0;
    }
}

Client.prototype.incBanCnt = function() {
    var client = this;
    dbhelper.insertBanUser(this.socket.handshake.session.username, function(result) {
        client.socket.handshake.session.userinfo.banCnt++;
    });
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

    const client = this;

    if( LevelExpTable.isAbleLevelUp(this.auth, this.socket.handshake.session.userinfo.ap) ) {
        this.auth++;
        this.socket.handshake.session.userinfo.auth++;
        dbhelper.updateAuth( this.socket.handshake.session.username, this.auth, function( result ) {
            client.servman.sendServerMsg(client.socket, `레벨 업!!`);
            client.servman.updateInfo();
        } );
    }
}

Client.prototype.getActivePoint = function() {
    if( !this.isLogined() ) return 0;
    return this.socket.handshake.session.userinfo.ap;
}

module.exports = Client;