/**
 * Created by nnnyy on 2018-05-10.
 */
var HashMap = require('hashmap');
var Client = require('./client');
require('./StringFunction');
var dbhelper = require('./dbhelper');

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
    this.banMap = new HashMap();
    this.uniqueip = new HashMap();
    this.counts = new HashMap();
    this.banUsers = new HashMap();
    this.searchedByType = new HashMap();
    this.check_connections = new HashMap();
    this.adminClient = null;
    this.countslist = [];
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
            /*var msg = '너무 접속 시도를 많이했습니다. 3분뒤에 접속 시도 해주세요.';
            socket.emit('serv_msg', {msg: msg});
            socket.disconnect();*/
            //this.others.push({channel: "chat", data: {id: socket.id, hash: '', nickname: '알림', msg: ip + '-> 많은 접속 시도' , mode: "notice", isBaned: false, admin: false }});
            //return;
        }
    }

    this.socketmap.set(socket, new Client(socket));

    if( socket.request.session.username ) {
        servman.others.push({channel: "chat", data: {id: socket.id, hash: '', nickname: '알림', msg: socket.request.session.usernick + '님의 입장!' , mode: "notice", isBaned: false, admin: false }});
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
    }, 450);

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

    var _counts = [0,0,0];
    this.counts.forEach(function(value, key) {
        _counts[0] += value[0];
        _counts[1] += value[1];
        _counts[2] += value[2];
    })

    this.io.sockets.emit('vote_data', {vote_data: { cnt: _counts, users: this.socketmap.count(), bans: this.banUsers.count()}, others: this.others })
    this.others = [];
}

ServerMan.prototype.click = function(idx) {
    var cur = new Date();
    cur -= cur % VOTEPERTIME;
    cur /= VOTEPERTIME;

    var obj = this.counts.get(cur);
    if( obj == null ) {
        this.counts.set(cur, [0,0,0]);
        this.countslist.push(cur);
        if( this.counts.count() > 10 ) {
            this.counts.delete(this.countslist[0]);
            this.countslist.shift();
        }
        obj = this.counts.get(cur);
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
        console.log(e);
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

    socket.emit('myid', {socket: socket.id});

    socket.on('disconnect', function(){
        var client = servman.getClient(this);
        if( client && client.isAdmin ) {
            servman.adminClient = null;
            servman.others.push({channel: "chat", data: {id: socket.id, hash: '', nickname: '알림', msg: '~~사이트관리자 퇴장~~' , mode: "notice", isBaned: false, admin: false }});
        }
        servman.removeSocket(this);
    });

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
        if( client.isClickable() ) {
            servman.click(data.idx);
            if( socket.request.session.username ) {
                servman.click(data.idx);
            }
            client.tLastClick = new Date();

            var number = Number(data.idx) + 1;

            var logined = socket.request.session.username ? true : false;
            var nick = logined ? socket.request.session.usernick : data.nickname + '(' + ip + ')';

            servman.others.push({channel: "chat", data: {id: this.id, hash: ipHashed, nickname: nick, msg: '[투표] ' + number, mode: "vote", vote: data.idx, isBaned: false, admin: client.isAdmin, isLogin: logined }})
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

            if( client.isAdmin && data.msg == "#quiz") {
                dbhelper.getRandomQuiz(function(result) {
                    if( result.ret == 0 )
                        servman.io.sockets.emit('quiz', {quizdata: result.quizdata});
                });
                return;
            }

            ip = ip.substr(0, ip.lastIndexOf('.') + 1) + 'xx';
            //servman.others.push({channel: "chat", data: {id: this.id, hash: ipHashed, nickname: data.nickname + '(' + ip + ')', msg: data.msg, mode: "chat", isBaned: isBaned, admin: client.isAdmin }})
            var logined = socket.request.session.username ? true : false;
            var nick = logined ? socket.request.session.usernick : data.nickname + '(' + ip + ')';
            servman.io.sockets.emit('chat', {id: this.id, hash: ipHashed, nickname: nick, msg: data.msg, mode: "chat", isBaned: isBaned, admin: client.isAdmin, isLogin: logined });
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
            var nick = logined ? socket.request.session.usernick : data.nickname + '(' + ip + ')';
            //servman.others.push({channel: "chat", data: {id: this.id, hash: ipHashed, nickname: data.nickname + '(' + ip + ')', msg: '[검색] ' + data.msg, mode: "search", isBaned: isBaned, admin: client.isAdmin }});
            servman.io.sockets.emit('chat', {id: this.id, hash: ipHashed, nickname: nick, msg: '[검색] ' + data.msg, mode: "search", isBaned: isBaned, admin: client.isAdmin, isLogin: logined });
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

module.exports = servman;
