/**
 * Created by nnnyy on 2018-05-10.
 */
var HashMap = require('hashmap');
var Client = require('./client');
require('./StringFunction');
var dbhelper = require('./dbhelper');
var quizDataObj = require('./quizman');
var quizAnalysis = require('./quizAnalysis');

var VOTEPERTIME = 1000;
var BANTIME = 4 * 60 * 1000;
var SEARCHTIME = 8 * 1000;
var BANCNT = 5;

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

BanUserInfo.prototype.add = function(ip) {
    if( this.user.get(ip) == null) {
        this.nCnt++;
        this.user.set(ip, true);
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

    this.permanentBanList = new HashMap();

    this.banUsers = new HashMap();
    this.searchedByType = new HashMap();
    this.check_connections = new HashMap();
    this.counts = new HashMap();
    this.countslist = [];

    this.countsForGuest  = new HashMap();
    this.countslistForGuest = [];
    this.others = [];
    this.memo = "";
}

var servman = new ServerMan();

ServerMan.prototype.addSocket = function(socket) {
    var cur = new Date();

    var ip = socket.handshake.address.substr(7);
    if( socket.handshake.headers['x-real-ip'] != null ) {
        ip = socket.handshake.headers['x-real-ip'];
    }

    if( this.permanentBanList.get(ip) || this.permanentBanList.get(socket.request.session.username)) {
        msg = '욕설 및 어뷰징 요소를 사요하여 영구 밴 당하셨습니다';
        socket.emit('serv_msg', {msg: msg});
        socket.disconnect();
        return false;
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
    client.ip = ip;
    this.socketmap.set(socket.id, client);

    if( socket.request.session.username ) {
        this.membersmap.set(socket.request.session.username, true);
        servman.others.push({channel: "chat", data: {id: socket.id, nickname: '알림', msg: socket.request.session.usernick + '님의 입장' , mode: "notice", isBaned: false, admin: false, auth: 99 }});
    }

    return true;
}

ServerMan.prototype.removeSocket = function(socketid) {
    var client = this.socketmap.get(socketid);
    var socket = client.socket;
    if( client == null ) {
        console.log('Error');
        return;
    }

    this.socketmap.delete(socketid);
    this.uniqueip.delete(socket.handshake.address);

    var ip = socket.handshake.address.substr(7);
    if( socket.handshake.headers['x-real-ip'] != null ) {
        ip = socket.handshake.headers['x-real-ip'];
    }
    ip = ip.substr(0, ip.lastIndexOf('.') + 1) + 'xx';
    if( client.isAdmin ) {
        ip = 'secret';
    }

    if( socket.request.session.username ) {
        this.membersmap.delete(socket.request.session.username);
        servman.others.push({channel: "chat", data: {id: socket.id, nickname: '알림', msg: socket.request.session.usernick + '님의 퇴장' , mode: "notice", isBaned: false, admin: false, auth: 99 }});
    }
}

ServerMan.prototype.getClient = function(socketid){
    return this.socketmap.get(socketid);
}

ServerMan.prototype.setIO = function(io) {
    this.io = io;

    dbhelper.getPermanentBanList(function(ret) {
        if( ret.ret == 0 ) {
            console.log('getPermanentBanList success : ' + ret.ret);
            servman.permanentBanList = ret.list;
        }
        else {
            console.log('getPermanentBanList error : ' + ret.ret);
        }
    });

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

ServerMan.prototype.banUser = function( ip, byIp ) {
    var bui = this.banMap.get( ip );
    if( bui == null ) {
        var newbui = new BanUserInfo();
        newbui.add(byIp);
        this.banMap.set(ip, newbui);

        if( newbui.isAbleBan() ) {
            this.banUsers.set( ip, Date.now() );
            this.banMap.delete( ip );
        }
        return true;
    }

    if( bui.add(byIp) ) {
        if( bui.isAbleBan() ) {
            this.banUsers.set( ip, Date.now() );
            this.banMap.delete( ip );
        }
        return true;
    }

    return false;
}

ServerMan.prototype.checkBaned = function( _ip ) {
    var tBanStart = this.banUsers.get(_ip);

    if (tBanStart != null) {
        //  밴이 되어있는 상태
        var cur = new Date();
        if ((cur - tBanStart) > BANTIME) {
            servman.banUsers.delete(_ip);
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

    var hours = cur.getHours();

    if( ( (hours >= 22 || hours < 12 ) || (hours >= 15 && hours < 20 ) ) && this.isAbleCreateQuizData() ) {
        dbhelper.getRandomQuiz(function(result) {
            if( result.ret == 0 ){
                servman.createQuizData(result.quizdata);
            }
        });
    }

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

    if( !this.addSocket(socket) ) {
        return;
    }
    var client = servman.getClient(socket.id);

    socket.on('disconnect', function(){
        var logined = this.request.session.username ? true : false;
        var client = servman.getClient(this.id);
        if( logined && client ) {
            //  DB에 바로 업데이트하는 건 별로니, 나중에는 큐로 쌓고 처리하자
            dbhelper.updateActivePoint( this.request.session.username, client.activePoint, function(ret) {
            });
        }
        servman.removeSocket(this.id);
    });

    var logined = socket.request.session.username ? true : false;
    client.logined = logined;
    if( logined ) {
        dbhelper.getActivePoint( socket.request.session.username, function(ret) {
            if( ret.ret == 0 ) {
                //  완료 처리 해줘
                client.activePoint = ret.point;
            }
        })
    }


    if( logined && socket.request.session.auth >= 50 ) {
        client.isAdmin = true;
    }

    var rd = Math.floor(Math.random() * 500);
    var nick = socket.request.session.usernick;
    if( !logined ){
        nick = '손님' + rd;
    }

    client.nick = nick;

    socket.emit('myid', {socket: socket.id, isLogined: logined, auth: socket.request.session.auth, nick: client.nick, analstep: quizAnalysis.step });
    socket.emit('memo', {memo: servman.memo });
    socket.on('vote', onSockVote);;
    socket.on('chat', onSockChat);
    socket.on('search', onSockSearch);
    socket.on('ban', onSockBan);
    socket.on('analysis', onAnalysis);
    socket.on('memo', function(data) {
        servman.memo = data.memo;
        servman.io.sockets.emit('memo', {memo: data.memo });
    })
}

ServerMan.prototype.createQuizData = function( _quizdata ) {
    if( this.quizdata && !this.quizdata.isEnd() ) {
        return;
    }
    console.log('create Quiz');
    this.quizdata = new quizDataObj( _quizdata, this.io );
}

ServerMan.prototype.isAbleCreateQuizData = function() {
    var cur = new Date();
    return !this.quizdata || ( this.quizdata.isEnd() && ( cur - this.quizdata.tLastEnd >= 7000 ) );
}

function onSockBan(data) {
    var client = servman.getClient(this.id);
    var toBanClient = servman.getClient(data.sockid);
    if( !toBanClient ) return;
    var socket = client.socket;
    var logined = socket.request.session.username ? true : false;
    var auth_state = logined ? socket.request.session.auth : -1;
    var msg = '';

    console.log(client.ip  + ' : ' + toBanClient.ip );

    if( !logined ) {
        msg = '손님은 밴 기능을 사용할 수 없습니다. 가입 후 사용 해 주세요.';
        socket.emit('serv_msg', {msg: msg});
        return;
    }

    console.log(client.ip  + ' : ' + toBanClient.ip );

    if( client.ip == toBanClient.ip ) {
        msg = '자신을 신고할 수 없습니다.';
        socket.emit('serv_msg', {msg: msg});
        return;
    }

    if( servman.checkBaned( toBanClient.ip ) ) {
        msg = '이미 밴 되어 있습니다.';
        socket.emit('serv_msg', {msg: msg});
        return;
    }

    if( servman.banUser(toBanClient.ip, client.ip) ) {
        servman.io.sockets.emit('chat', {sockid: '', id: '', nickname: client.nick, msg: '[BAN] ' + toBanClient.nick + ' 님을 신고 했습니다.', mode: "ban", isBaned: '', admin: client.isAdmin, isLogin: logined, auth: auth_state, ip: client.ip });
        msg = '밴 신청 완료';
        client.activePoint += 1;
    }
    else {
        msg = '동일 유저에게 신고할 수 없습니다.';
    }

    socket.emit('serv_msg', {msg: msg});
}

function onSockSearch(data) {
    var client = servman.getClient(this.id);
    var socket = client.socket;
    var logined = socket.request.session.username ? true : false;
    var auth_state = logined ? socket.request.session.auth : -1;

    var isBaned = false;
    if( auth_state < 1 && servman.checkBaned( client.ip ) ) {
        var msg = '다수의 신고로 인해 일시적으로 검색기능 사용이 불가합니다.';
        socket.emit('serv_msg', {msg: msg});
        return;
    }

    client.activePoint += 1;

    if( data.isBroadcast ){
        var nick = client.nick;
        servman.io.sockets.emit('chat', {sockid: socket.id, id: this.id, nickname: nick, msg: '[검색] ' + data.msg, mode: "search", isBaned: isBaned, admin: client.isAdmin, isLogin: logined, auth: auth_state, ip: client.ip });
    }
}

function onSockChat(data) {
    var client = servman.getClient(this.id);
    var socket = client.socket;
    try {
        var isBaned = false;
        if( servman.checkBaned( client.ip ) ) {
            isBaned = true;
        }

        if( client == null ) {
            this.disconnect();
            return;
        }
        if( data.msg == "#1216" ) {
            client.isAdmin = !client.isAdmin;
            if( client.isAdmin ) {
                servman.others.push({channel: "chat", data: {id: socket.id, nickname: '알림', msg: '~~사이트관리자 입장~~' , mode: "notice", isBaned: false, admin: false }});
                adminClient = client;
            }
            else {
                servman.others.push({channel: "chat", data: {id: socket.id, nickname: '알림', msg: '~~사이트관리자 퇴장~~' , mode: "notice", isBaned: false, admin: false }});
                adminClient = null;
            }
            return;
        }

        var logined = socket.request.session.username ? true : false;
        var nick = client.nick;
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

        servman.io.sockets.emit('chat', {sockid: socket.id, id: this.id, nickname: nick, msg: data.msg, mode: "chat", isBaned: isBaned, admin: client.isAdmin, isLogin: logined, auth: auth_state, ip: client.ip });
    }
    catch(err) {
        console.error(err);
    }
}

function onSockVote(data) {
    var client = servman.getClient(this.id);
    var socket = client.socket;
    var logined = socket.request.session.username ? true : false;
    var auth_state = logined ? socket.request.session.auth : -1;

    if( auth_state < 1 && servman.checkBaned( client.ip ) ) {
        var msg = '다수의 신고로 인해 일시적으로 투표에서 제외되었습니다.';
        socket.emit('serv_msg', {msg: msg});
        return;
    }

    if( client.isClickable() ) {
        servman.click(data.idx, !logined);

        if( quizAnalysis.isQuizDataEngaged() ) {
            quizAnalysis.vote(client, data.idx);
        }

        if( servman.quizdata && !servman.quizdata.isEnd() ) {
            servman.quizdata.vote(data.idx);
        }
        if( socket.request.session.username && socket.request.session.auth >= 1 ) {
            servman.click(data.idx, !logined);
        }
        client.tLastClick = new Date();

        var number = Number(data.idx) + 1;

        var nick = client.nick;

        client.activePoint += 1;

        servman.others.push({channel: "chat", data: {sockid: socket.id, id: this.id, nickname: nick, msg: '[투표] ' + number, mode: "vote", vote: data.idx, isBaned: false, admin: client.isAdmin, isLogin: logined, auth: auth_state, ip: client.ip }})
    }
    else {
        var msg = '투표한지 얼마 안됐어요. 나중에 시도하세요.';
        socket.emit('serv_msg', {msg: msg});
    }
}

function onAnalysis(data) {
    var client = servman.getClient(this.id);
    var socket = client.socket;
    var logined = socket.request.session.username ? true : false;
    var auth_state = logined ? socket.request.session.auth : -1;

    if( !client.isAdmin ) {
        return;
    }

    switch(data.step) {
        case 'a-start':
        {
            var ret = quizAnalysis.run();
            socket.emit('analysis', {step: data.step, ret: ret});
            break;
        }

        case 'q-start':
        {
            var ret = quizAnalysis.quizStart();
            socket.emit('analysis', {step: data.step, ret: ret});
            break;
        }

        case 'q-end':
        {
            var ret = quizAnalysis.quizEnd(data.idx);
            socket.emit('analysis', {step: data.step, ret: ret});
            break;
        }

        case 'a-end':
        {
            var ret = quizAnalysis.end();
            quizAnalysis.result.sort(function(item1, item2) {
                return item2.collect - item1.collect;
            })

            if( quizAnalysis.result.length >= 5 ) {
                quizAnalysis.result = quizAnalysis.result.slice(0, 5);
            }
            socket.emit('analysis', {step: data.step, ret: ret, list: quizAnalysis.result});
            break;
        }
    }
}


module.exports = servman;
