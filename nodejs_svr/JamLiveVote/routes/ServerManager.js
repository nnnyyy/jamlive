/**
 * Created by nnnyy on 2018-05-10.
 */
var HashMap = require('hashmap');
var Client = require('./client');
require('./StringFunction');
var dbhelper = require('./dbhelper');
var quizDataObj = require('./quizman');

var VOTEPERTIME = 1000;
var BANTIME = 4 * 60 * 1000;
var SEARCHTIME = 8 * 1000;
var BANCNT = 3;

var ConnectUserInfo = function() {
    this.tLast = new Date();
    this.nCnt = 1;
}

var CachedSearchData = function() {
    this.searched = new HashMap();
}

var BanUserInfo = function() {
    this.nCnt = 0;
    this.user = new HashMap();
}

BanUserInfo.prototype.add = function(byHash) {
    if( this.user.get(byHash) == null) {
        this.nCnt++;
        this.user.set(byHash, true);
        return true;
    }

    return false;
}

BanUserInfo.prototype.isAbleBan = function() {
    if( this.nCnt >= BANCNT )
        return true;

    return false;
}

var ServerMan = function() {
    this.socketmap = new HashMap();
    this.membersmap = new HashMap();
    this.banMap = new HashMap();
    this.uniqueip = new HashMap();

    this.banUsers = new HashMap();
    this.searchedByType = new HashMap();
    this.check_connections = new HashMap();
    this.counts = new HashMap();
    this.countslist = [];

    this.countsForGuest  = new HashMap();
    this.countslistForGuest = [];
    this.others = [];
}

var servman = new ServerMan();

ServerMan.prototype.addSocket = function(socket) {
    var cur = new Date();

    var ip = socket.handshake.address.substr(7);
    if( socket.handshake.headers['x-real-ip'] != null ) {
        ip = socket.handshake.headers['x-real-ip'];
    }

    var cinfo = this.check_connections.get(ip);
    if( cinfo == null ) {
        cinfo = new ConnectUserInfo();
        this.check_connections.set(ip, cinfo);
    }
    else {
        cinfo.tLast = new Date();
        cinfo.nCnt++;
        if( cinfo.nCnt >= 10 ) {
        }
    }

    var client = new Client(socket);
    this.socketmap.set(socket, client);

    if( socket.request.session.username ) {
        this.membersmap.set(socket.request.session.username, true);
        servman.others.push({channel: "chat", data: {id: socket.id, hash: '', nickname: '알림', msg: socket.request.session.usernick + '님의 입장' , mode: "notice", isBaned: false, admin: false }});
    }

    ip = ip.substr(0, ip.lastIndexOf('.') + 1) + 'xx';


    //this.others.push({channel: "chat", data: {id: socket.id, hash: '', nickname: '알림', msg: ip + '입장' , mode: "notice", isBaned: false, admin: false }});
    //console.log('user connected : ' + socket.handshake.headers['x-real-ip']);
}

ServerMan.prototype.removeSocket = function(socket) {
    var client = this.socketmap.get(socket);
    if( client == null ) {
        console.log('Error');
        return;
    }

    this.socketmap.delete(socket);
    this.uniqueip.delete(socket.handshake.address);

    var ip = socket.handshake.address.substr(7);
    if( socket.handshake.headers['x-real-ip'] != null ) {
        ip = socket.handshake.headers['x-real-ip'];
    }
    ip = ip.substr(0, ip.lastIndexOf('.') + 1) + 'xx';
    if( client.isAdmin ) {
        ip = '사이트관리자';
    }

    if( socket.request.session.username ) {
        this.membersmap.delete(socket.request.session.username);
        servman.others.push({channel: "chat", data: {id: socket.id, hash: '', nickname: '알림', msg: socket.request.session.usernick + '님의 퇴장' , mode: "notice", isBaned: false, admin: false }});
    }

    //this.others.push({channel: "chat", data: {id: socket.id, hash: '', nickname: '알림', msg: ip + '퇴장' , mode: "notice", isBaned: false, admin: false }});
    //console.log('user disconnected : ' + socket.handshake.headers['x-real-ip']);
}

ServerMan.prototype.getClient = function(socket){
    return this.socketmap.get(socket);
}

ServerMan.prototype.setIO = function(io) {
    this.io = io;

    setInterval(function() {
        servman.broadcastVoteInfo();
    }, 400);

    setInterval(function() {
        servman.checkAllBaned();
    }, 3000);
}

ServerMan.prototype.broadcastVoteInfo = function() {
    var cur = new Date();
    cur -= cur % VOTEPERTIME;
    cur /= VOTEPERTIME;

    if( this.counts.get(cur) == null ) {
        this.counts.set(cur, [0,0,0]);
        this.countslist.push(cur);
        if( this.counts.count() > 10 ) {
            this.counts.delete(this.countslist[0]);
            this.countslist.shift();
        }
    }

    if( this.countsForGuest.get(cur) == null ) {
        this.countsForGuest.set(cur, [0,0,0]);
        this.countslistForGuest.push(cur);
        if( this.countsForGuest.count() > 10 ) {
            this.countsForGuest.delete(this.countslistForGuest[0]);
            this.countslistForGuest.shift();
        }
    }

    var _counts = [0,0,0];
    var _countsForGuest = [0,0,0];

    this.counts.forEach(function(value, key) {
        _counts[0] += value[0];
        _counts[1] += value[1];
        _counts[2] += value[2];
    })

    this.countsForGuest.forEach(function(value, key) {
        _countsForGuest[0] += value[0];
        _countsForGuest[1] += value[1];
        _countsForGuest[2] += value[2];
    })

    this.io.sockets.emit('vote_data', {vote_data: { cnt: _counts, guest_cnt: _countsForGuest, users: this.socketmap.count(), bans: this.banUsers.count()}, others: this.others })
    this.others = [];
}

ServerMan.prototype.click = function(idx, isGuest) {
    var cur = new Date();
    cur -= cur % VOTEPERTIME;
    cur /= VOTEPERTIME;

    console.log( isGuest );

    var _counts = isGuest ? this.countsForGuest : this.counts;
    var _countslist = isGuest ? this.countslistForGuest : this.countslist;

    var obj = _counts.get(cur);
    if( obj == null ) {
        _counts.set(cur, [0,0,0]);
        _countslist.push(cur);
        if( _counts.count() > 10 ) {
            _counts.delete(_countslist[0]);
            _countslist.shift();
        }
        obj = _counts.get(cur);
    }

    if( obj == null ) return;
    obj[idx]++;
}

ServerMan.prototype.banUser = function( hash, byHash ) {
    var bui = this.banMap.get( hash );
    if( bui == null ) {
        var newbui = new BanUserInfo();
        newbui.add(byHash);
        this.banMap.set(hash, newbui);

        if( newbui.isAbleBan() ) {
            this.banUsers.set( hash, Date.now() );
            this.banMap.delete( hash );
        }
        return true;
    }

    if( bui.add(byHash) ) {
        if( bui.isAbleBan() ) {
            this.banUsers.set( hash, Date.now() );
            this.banMap.delete( hash );
        }
        return true;
    }

    return false;
}

ServerMan.prototype.checkBaned = function( _hash ) {
    var hash = _hash.toString();
    var tBanStart = this.banUsers.get(hash);

    if (tBanStart != null) {
        //  밴이 되어있는 상태
        var cur = new Date();
        if ((cur - tBanStart) > BANTIME) {
            servman.banUsers.delete(hash);
            return false;
        }
        else {
            return true;
        }
    }
    else {
        return false;
    }
}

ServerMan.prototype.checkAllBaned = function() {
    var cur = new Date();

    try {
        this.banUsers.forEach(function(value, key) {
            if( cur - value > BANTIME) {
                servman.banUsers.delete(key);
            }
        });

        this.searchedByType.forEach(function(cachedSearchData, key) {
            cachedSearchData.searched.forEach(function(val, key2) {
                if( cur - val.tLast > SEARCHTIME) {
                    cachedSearchData.searched.delete(key2);
                }
            });
        })

        this.check_connections.forEach(function(val, key) {
            if( cur - val.tLast > 3 * 60 * 1000 ) {
                servman.check_connections.delete(key);
            }
        })
    }catch(e) {
        console.log('checkAllBaned error : ' + e);
    }
}

ServerMan.prototype.getCachedSearchResult = function(sType, query) {
    var cachedType = this.searchedByType.get(sType);
    if( !cachedType ) {
        cachedType = new CachedSearchData();
        this.searchedByType.set( sType, cachedType );
    }

    var d = cachedType.searched.get(query);
    if( d != null ) {
        return d.data;
    }

    return null;
}

ServerMan.prototype.setCachedSearchResult = function(sType, query, data) {
    var cachedType = this.searchedByType.get(sType);
    if( !cachedType ) {
        cachedType = new CachedSearchData();
        this.searchedByType.set( sType, cachedType );
    }

    var d = cachedType.searched.get(query);
    if( d ) {
        d.tLast = new Date();
        cachedType.searched.set(query, d);
        return;
    }

    cachedType.searched.set(query, {data: data, tLast: new Date()});
}


ServerMan.prototype.register = function(socket) {
    this.addSocket(socket);

    socket.on('disconnect', function(){
        var client = servman.getClient(this);
        if( client && client.isAdmin ) {
            servman.adminClient = null;
            servman.others.push({channel: "chat", data: {id: socket.id, hash: '', nickname: '알림', msg: '~~사이트관리자 퇴장~~' , mode: "notice", isBaned: false, admin: false }});
        }
        servman.removeSocket(this);
    });

    var logined = socket.request.session.username ? true : false;
    socket.emit('myid', {socket: socket.id, isLogined: logined });

    socket.on('vote', function(data) {
        var client = servman.getClient(this);
        var ip = this.handshake.address.substr(7);
        if( socket.handshake.headers['x-real-ip'] != null ) {
            ip = socket.handshake.headers['x-real-ip'];
        }
        var ipHashed = ip.hashCode();

        if( servman.checkBaned( ipHashed ) ) {
            var msg = '다수의 신고로 인해 일시적으로 투표에서 제외되었습니다.';
            socket.emit('serv_msg', {msg: msg});
            return;
        }

        ip = ip.substr(0, ip.lastIndexOf('.') + 1) + 'xx';

        var logined = socket.request.session.username ? true : false;

        if( client.isClickable() ) {
            servman.click(data.idx, !logined);
            if( servman.quizdata && !servman.quizdata.isEnd() ) {
                servman.quizdata.vote(data.idx);
            }
            if( socket.request.session.username && socket.request.session.auth >= 1 ) {
                servman.click(data.idx, !logined);
            }
            client.tLastClick = new Date();

            var number = Number(data.idx) + 1;

            var nick = logined ? socket.request.session.usernick : data.nickname + '(' + ip + ')';
            var auth_state = socket.request.session.auth;

            servman.others.push({channel: "chat", data: {id: this.id, hash: ipHashed, nickname: nick, msg: '[투표] ' + number, mode: "vote", vote: data.idx, isBaned: false, admin: client.isAdmin, isLogin: logined, auth: auth_state }})
            //servman.io.sockets.emit('chat', {id: this.id, hash: ipHashed, nickname: data.nickname + '(' + ip + ')', msg: '[투표] ' + number, mode: "vote", vote: data.idx, isBaned: false, admin: client.isAdmin });
        }
        else {
            var msg = '투표한지 얼마 안됐어요. 나중에 시도하세요.';
            socket.emit('serv_msg', {msg: msg});
        }
    });

    socket.on('chat', function(data) {
        try {
            var ip = this.handshake.address.substr(7);
            if( socket.handshake.headers['x-real-ip'] != null ) {
                ip = socket.handshake.headers['x-real-ip'];
            }
            var ipHashed = ip.hashCode();

            var isBaned = false;
            if( servman.checkBaned( ipHashed ) ) {
                isBaned = true;
            }

            var client = servman.getClient(this);
            if( client == null ) {
                this.disconnect();
                return;
            }
            if( data.msg == "#1216" ) {
                client.isAdmin = !client.isAdmin;
                if( client.isAdmin ) {
                    servman.others.push({channel: "chat", data: {id: socket.id, hash: '', nickname: '알림', msg: '~~사이트관리자 입장~~' , mode: "notice", isBaned: false, admin: false }});
                    adminClient = client;
                }
                else {
                    servman.others.push({channel: "chat", data: {id: socket.id, hash: '', nickname: '알림', msg: '~~사이트관리자 퇴장~~' , mode: "notice", isBaned: false, admin: false }});
                    adminClient = null;
                }
                return;
            }

            var logined = socket.request.session.username ? true : false;
            var nick = logined ? socket.request.session.usernick : data.nickname + '(' + ip + ')';
            var auth_state = socket.request.session.auth;

            if( ( client.isAdmin || (auth_state && auth_state >= 1)) && data.msg == "#quiz") {
                dbhelper.getRandomQuiz(function(result) {
                    if( result.ret == 0 ){
                        servman.createQuizData(result.quizdata);
                    }
                });
                return;
            }

            if( ( client.isAdmin || (auth_state && auth_state >= 1)) && data.msg == "#bbam") {
                servman.io.sockets.emit('effect', {name: 'bbam'});
                return;
            }

            ip = ip.substr(0, ip.lastIndexOf('.') + 1) + 'xx';
            //servman.others.push({channel: "chat", data: {id: this.id, hash: ipHashed, nickname: data.nickname + '(' + ip + ')', msg: data.msg, mode: "chat", isBaned: isBaned, admin: client.isAdmin }})
            servman.io.sockets.emit('chat', {id: this.id, hash: ipHashed, nickname: nick, msg: data.msg, mode: "chat", isBaned: isBaned, admin: client.isAdmin, isLogin: logined, auth: auth_state });
        }
        catch(err) {
            console.error(err);
        }
    })

    socket.on('search', function(data) {
        var ip = this.handshake.address.substr(7);
        if( socket.handshake.headers['x-real-ip'] != null ) {
            ip = socket.handshake.headers['x-real-ip'];
        }
        var ipHashed = ip.hashCode();
        ip = ip.substr(0, ip.lastIndexOf('.') + 1) + 'xx';

        var isBaned = false;
        if( servman.checkBaned( ipHashed ) ) {
            var msg = '다수의 신고로 인해 일시적으로 검색기능 사용이 불가합니다.';
            socket.emit('serv_msg', {msg: msg});
            return;
        }

        if( data.isBroadcast ){
            var client = servman.getClient(this);
            var logined = socket.request.session.username ? true : false;
            if( !logined ) {
                socket.emit('serv_msg', {msg: '손님은 검색결과 제한이 있습니다. 왼쪽상단의 "고정닉 가입" 하세요'});
            }
            var nick = logined ? socket.request.session.usernick : data.nickname + '(' + ip + ')';
            var auth_state = socket.request.session.auth;
            //servman.others.push({channel: "chat", data: {id: this.id, hash: ipHashed, nickname: data.nickname + '(' + ip + ')', msg: '[검색] ' + data.msg, mode: "search", isBaned: isBaned, admin: client.isAdmin }});
            servman.io.sockets.emit('chat', {id: this.id, hash: ipHashed, nickname: nick, msg: '[검색] ' + data.msg, mode: "search", isBaned: isBaned, admin: client.isAdmin, isLogin: logined, auth: auth_state });
        }
    })

    socket.on('ban', function(data) {
        var ip = this.handshake.address.substr(7);
        if( socket.handshake.headers['x-real-ip'] != null ) {
            ip = socket.handshake.headers['x-real-ip'];
        }
        var ipHashed = ip.hashCode();

        var msg = '';

        if( ipHashed == data.hash ) {
            msg = '자신을 신고할 수 없습니다.';
            socket.emit('serv_msg', {msg: msg});
            return;
        }

        if( servman.checkBaned( ipHashed ) ) {
            msg = '이미 밴 되어 있습니다.';
            socket.emit('serv_msg', {msg: msg});
            return;
        }

        if( servman.banUser(data.hash, ipHashed) ) {
            msg = '밴 신청 완료';
        }
        else {
            msg = '동일 유저에게 신고할 수 없습니다.';
        }

        socket.emit('serv_msg', {msg: msg});
    })

    socket.on('help_search', function(data) {
        var ip = this.handshake.address.substr(7);
        if( socket.handshake.headers['x-real-ip'] != null ) {
            ip = socket.handshake.headers['x-real-ip'];
        }
        var ipHashed = ip.hashCode();
        if( ipHashed == data.hash ) {
            msg = '자신에게 요청할 수 없습니다.';
            socket.emit('serv_msg', {msg: msg});
            return;
        }
    })
}

ServerMan.prototype.createQuizData = function( _quizdata ) {
    if( this.quizdata && !this.quizdata.isEnd() ) {
        return;
    }
    this.quizdata = new quizDataObj( _quizdata, this.io );
}

module.exports = servman;
