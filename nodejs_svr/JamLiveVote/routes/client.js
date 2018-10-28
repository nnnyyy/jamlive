/**
 * Created by nnnyy on 2018-05-10.
 */
const LevelExpTable = require('./modules/LevelExpTable');
const dbhelper = require('./dbhelper');

var Client = function(servman, socket) {
    this.servman = servman;
    this.socket = socket;
    this.tLastClick = 0;
    this.tLastSaved = new Date();
    this.auth = -1;
    this.nick = '';
    this.ip = '';
    this.tLastChat = 0;
    this.tLastSearch = 0;
    this.tLastLike = 0;
    this.lastVoteIdx = -1;
}

Client.prototype.getBanCnt = function() {
    try {
        if( this.isLogined() ) {
            return this.socket.handshake.session.userinfo.banCnt;
        }
        else {
            return 0;
        }
    }catch(e) {
        console.log(`getBanCnt - ${e}`);
        return 0;
    }
}

Client.prototype.save = function() {
    console.log(`${this.getUserId()} data saved`);
    dbhelper.updateActivePoint( this.getUserId(), this.getActivePoint(), function(ret) {
    });
}

Client.prototype.incBanCnt = function() {
    var client = this;

    try {
        if( !this.isLogined() ) return;

        dbhelper.insertBanUser(this.socket.handshake.session.username, function(result) {
            try {
                if( client && client.socket ) {
                    client.socket.handshake.session.userinfo.banCnt++;
                }
            }catch(e) {
                console.log(e);
            }
        });
    }
    catch(e) {
        console.log(`incBanCnt - ${e}`);
    }
}

Client.prototype.isClickable = function() {
    var cur = new Date();
    var _auth = this.socket.handshake.session.username ? this.socket.handshake.session.userinfo.auth : -1;
    if( _auth >= 4 ) {
        return (cur - this.tLastClick) > 7000;
    }
    else if ( _auth == 0 ) {
        return (cur - this.tLastClick) > 10000;
    }

    return (cur - this.tLastClick) > 12000;
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
    return (tCur - this.tLastChat >= 2500);
}

Client.prototype.isAdminMembers = function() {
    if( !this.isLogined() ) return false;

    try {
        return this.isAdmin() || this.socket.handshake.session.userinfo.adminMemberVal >= 1;
    }catch(e) {
        return false;
    }
}

Client.prototype.incActivePoint = function( point ) {
    if( !this.isLogined() ) return;

    this.socket.handshake.session.userinfo.ap += point;

    const tCur = new Date();

    if( tCur - this.tLastSaved >= 10 * 60 * 1000 ) {
        this.tLastSaved = tCur;
        const userinfo = JSON.stringify(this.socket.handshake.session.userinfo);
        this.servman.redis.set(this.getUserId(), userinfo,  (err, info) => {
        } );
    }

    this.servman.updateInfo(this.socket, this );

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

Client.prototype.getUserName = function() {
    if( !this.isLogined() ) return '';

    return this.socket.handshake.session.username;
}

Client.prototype.getUserInfo = function() {
    if( !this.isLogined() ) return null;

    return this.socket.handshake.session.userinfo;
}

Client.prototype.getLastVote = function(tCur) {
    if( tCur - this.tLastClick >= 60 * 1000 ) {
        return -1;
    }

    return this.lastVoteIdx;
}

module.exports = Client;