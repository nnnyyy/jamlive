/**
 * Created by nnnyy on 2018-05-10.
 */
var HashMap = require('hashmap');
var Client = require('./client');
require('./StringFunction');
var dbhelper = require('./dbhelper');
var quizDataObj = require('./quizman');
var quizAnalysis = require('./quizAnalysis');

var chatMan = require('./modules/chatMan');
var Chosung = require('./modules/chosungGame');

var config = require('../config');

var connectedListMan = require('./modules/ConnectedListMan');
const connListMan = new connectedListMan();

var VOTEPERTIME = 1000;
var BANTIME = 6 * 60 * 1000;
var SEARCHTIME = 8 * 1000;
var BANCNT = 4;

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
    this.banMap = new HashMap();
    this.permanentBanList = new HashMap();

    this.banUsers = new HashMap();
    this.searchedByType = new HashMap();
    this.counts = new HashMap();
    this.countslist = [];

    this.countsForGuest  = new HashMap();
    this.countslistForGuest = [];

    this.countsSearchFirst = new HashMap();
    this.countslistSearchFirst = [];

    this.searchQueryMap = new HashMap();
    this.memo = "";
    this.memo_provider = '';
    this.bMemoModifying = false;
    this.nextQuizShowdata = {};
}

var servman = new ServerMan();

ServerMan.prototype.register = function(socket) {
    if( !this.addSocket(socket) ) {
        return;
    }
    var client = servman.getClient(socket.id);

    socket.on('disconnect', function(){
        var client = servman.getClient(this.id);
        servman.removeSocket(this.id);
        if( client && client.isLogined() ) {
            if( servman.modifyingUser == client.nick ) {
                servman.modifyingUser = '';
                servman.bMemoModifying = false;
            }
            //  DB에 바로 업데이트하는 건 별로니, 나중에는 큐로 쌓고 처리하자
            dbhelper.updateActivePoint( this.handshake.session.username, client.activePoint, function(ret) {
                //console.log(`${client.nick} - updateActivePoint ret ${ret}`);
            });
        }
    });

    if( client.isLogined() ) {
        client.auth = socket.handshake.session.auth;
        dbhelper.getActivePoint( socket.handshake.session.username, function(ret) {
            if( ret.ret == 0 ) {
                //  완료 처리 해줘
                client.activePoint = ret.point;
                socket.emit('ap', {ap: client.activePoint });
                //console.log(`${client.nick} - getActivePoint success ( ${ret.point} )`);

            }
            else {
                //console.log(`${client.nick} - getActivePoint Error ( ${ret.ret} )`);
            }
        })
    }

    var rd = Math.floor(Math.random() * 500);
    var nick = socket.handshake.session.usernick;
    if( !client.isLogined() ){
        nick = '손님' + rd;
    }

    client.nick = nick;

    connListMan.addUser(client);
    connListMan.updateListToClient(client);

    if( config.mode == 'auth' ) {
        if ( !client.isLogined() ) {
            socket.emit('reconn-server', {logined: client.isLogined()});
        }
        else {
            if( client.auth < 3 && servman.socketmap.count() >= 300 ) {
                socket.emit('reconn-server', {logined: client.isLogined(), url: 'jamlive.net'});
            }
        }
    }

    socket.emit('myid', {socket: socket.id, isLogined: client.isLogined(), auth: client.auth, nick: client.nick, analstep: quizAnalysis.step });
    socket.emit('next-quiz', { data: servman.nextQuizShowdata });
    socket.emit('memo', {memo_provider: servman.memo_provider , memo: servman.memo });
    socket.on('vote', onSockVote);;
    socket.on('chat', onSockChat);
    socket.on('search', onSockSearch);
    socket.on('ban', onSockBan);
    socket.on('permanentban', onSockPermanentBan);
    socket.on('like', onSockLike);
    socket.on('analysis', onAnalysis);
    socket.on('memo', onMemo);
}


ServerMan.prototype.addSocket = function(socket) {
    try {
        let ip = socket.handshake.address.substr(7);
        if( socket.handshake.headers['x-real-ip'] != null ) {
            ip = socket.handshake.headers['x-real-ip'];
        }

        if( this.permanentBanList.get(ip) || this.permanentBanList.get(socket.handshake.session.username)) {
            socket.emit('reconn-server', {reason: 'baned', logined: true, url: 'jamlive.net'});
            return false;
        }

        const client = new Client(socket);
        client.ip = ip;
        this.socketmap.set(socket.id, client);

        if( client.isLogined() ) {
            //chatMan.Notice( servman.io, client, socket.handshake.session.usernick + '님의 입장' );
        }
    }catch(e) {
        console.log(`addsocket Error - ${e}`);
        return false;
    }

    return true;
}

ServerMan.prototype.removeSocket = function(socketid) {
    try {
        const client = this.socketmap.get(socketid);
        const socket = client.socket;
        if( !client ) {
            console.log('Error - Remove Socket');
            return;
        }

        connListMan.removeUser(client);
        this.socketmap.delete(socketid);

        if( client.isLogined() ) {
            //chatMan.Notice( servman.io, client, socket.handshake.session.usernick + '님의 퇴장' );
        }
    }
    catch(e) {
        console.log(`removeSocket Error - ${e}`);
    }
}

ServerMan.prototype.getClient = function(socketid){
    return this.socketmap.get(socketid);
}

ServerMan.prototype.setIO = function(io) {
    this.io = io;

    this.chosung = new Chosung(io);
    //this.chosung.start();

    dbhelper.getPermanentBanList(function(ret) {
        if( ret.ret == 0 ) {
            console.log('getPermanentBanList success : ' + ret.ret);
            servman.permanentBanList = ret.list;
        }
        else {
            console.log('getPermanentBanList error : ' + ret.ret);
        }
    });

    dbhelper.getNextQuizshowTime(function(ret) {
        servman.nextQuizShowdata = ret.data;
    })

    setInterval(function() {
        servman.broadcastVoteInfo();
    }, 400);

    setInterval(function() {
        servman.checkAllBaned();
    }, 3000);
}

ServerMan.prototype.broadcastVoteInfo = function() {
    let cur = new Date();

    if( this.chosung.isRunning() ) {

        if( isLiveQuizTime() ) {
            this.chosung.stop();
            return;
        }

        this.chosung.update( cur );
        return;
    }

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

    if( this.countsSearchFirst.get(cur) == null ) {
        this.countsSearchFirst.set(cur, [0,0,0]);
        this.countslistSearchFirst.push(cur);
        if( this.countsSearchFirst.count() > 10 ) {
            this.countsSearchFirst.delete(this.countslistSearchFirst[0]);
            this.countslistSearchFirst.shift();
        }
    }

    let _counts = [0,0,0];
    let _countsForGuest = [0,0,0];
    let _countsSearchFirst = [0,0,0];

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

    this.countsSearchFirst.forEach(function(value, key) {
        _countsSearchFirst[0] += value[0];
        _countsSearchFirst[1] += value[1];
        _countsSearchFirst[2] += value[2];
    })

    var searchlist = this.searchQueryMap.values();
    searchlist.sort(function(item1, item2) {
        return item2.cnt - item1.cnt;
    })

    searchlist = searchlist.slice(0, 5);

    let s = '';
    for( var i = 0 ; i < searchlist.length ; ++i ) {
        s += searchlist[i].query;
    }

    this.io.sockets.emit('vote_data', {vote_data: { cnt: _counts, guest_cnt: _countsForGuest, searched_cnt: _countsSearchFirst, users: this.socketmap.count(), bans: this.banUsers.count()}, searchlist: searchlist, slhash: s.hashCode() });
}

ServerMan.prototype.click = function(idx, isGuest, isSearchedUser) {
    var cur = new Date();
    cur -= cur % VOTEPERTIME;
    cur /= VOTEPERTIME;

    var _counts = isGuest ? this.countsForGuest : ( isSearchedUser ? this.countsSearchFirst : this.counts );
    var _countslist = isGuest ? this.countslistForGuest : ( isSearchedUser ? this.countslistSearchFirst : this.countslist );

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

    try {
        //  자동 퀴즈쇼 모드
        if( !isLiveQuizTime() && this.isAbleCreateQuizData() ) {
            dbhelper.getRandomQuiz(function(result) {
                if( result.ret == 0 ){
                    servman.createQuizData('자동퀴즈', result.quizdata);
                }
            });
        }

        //  다음 라이브 퀴즈쇼 업데이트
        var month = (cur.getMonth()+1).toString().pad(2);
        var day = cur.getDate().toString().pad(2);
        var first = `${cur.getFullYear()}-${month}-${day}T`;
        var todayQuizDate = new Date(first + servman.nextQuizShowdata.time );
        var day = cur.getDay() - 1;
        if( day < 0 ) day = 6;

        if (    servman.nextQuizShowdata.weekday != day ||
            (servman.nextQuizShowdata.weekday == day && cur - todayQuizDate > 0 )
        ) {
            dbhelper.getNextQuizshowTime(function(ret) {
                servman.nextQuizShowdata = ret.data;
                servman.io.sockets.emit('next-quiz', {data: servman.nextQuizShowdata});
            })
        }

        this.searchQueryMap.forEach(function(value, key) {
            if( cur - value.tLast > 12 * 1000 ) {
                servman.searchQueryMap.delete(key);
            }
        })

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

ServerMan.prototype.createQuizData = function( nick, _quizdata ) {
    if( this.quizdata && !this.quizdata.isEnd() ) {
        return;
    }
    this.quizdata = new quizDataObj( nick, _quizdata, this.io );
}

ServerMan.prototype.isAbleCreateQuizData = function() {
    var cur = new Date();
    return !this.quizdata || ( this.quizdata.isEnd() && ( cur - this.quizdata.tLastEnd >= 7000 ) );
}

ServerMan.prototype.addSearchQuery = function( query, bCount ) {
    if( !this.searchQueryMap.get( query ) ) {
        this.searchQueryMap.set( query, { query: query, cnt: 1, tLast: new Date() });
    }
    else {
        var d = this.searchQueryMap.get( query );
        if( bCount )
            d.cnt += 1;
        d.tLast = new Date();
    }
}

function onSockBan(data) {
    try {
        var client = servman.getClient(this.id);
        if( !client ) return;
        var toBanClient = data.sockid != '' ? servman.getClient(data.sockid) :  connListMan.getUser(data.nick);
        if( !toBanClient ) return;
        var socket = client.socket;
        var msg = '';

        if( !client.isLogined() ) {
            sendServerMsg(socket, '손님은 밴 기능을 사용할 수 없습니다. 가입 후 사용 해 주세요.');
            return;
        }

        if( client.ip == toBanClient.ip ) {
            sendServerMsg(socket, '자신을 신고할 수 없습니다.');
            return;
        }

        if( servman.checkBaned(client.ip) ) {
            sendServerMsg(socket, '밴유저는 다른 유저를 밴 할 수 없습니다.');
            return;
        }

        if( servman.checkBaned( toBanClient.ip ) ) {
            sendServerMsg(socket, '이미 밴 되어 있습니다.');
            return;
        }

        toBanClient.activePoint -= 10;
        if( toBanClient.activePoint <= 0 ) {
            toBanClient.activePoint = 0;
        }

        if( servman.banUser(toBanClient.ip, client.ip) ) {
            chatMan.Broadcast(servman.io, client, 'ban', `[BAN] ${toBanClient.nick}님을 신고 했습니다.`, false);
            msg = '밴 신청 완료';
            client.activePoint += 3;
        }
        else {
            msg = '동일 유저에게 신고할 수 없습니다.';
        }

        sendServerMsg(socket, msg);
    }catch(e) {
        console.log(`onSockBan Error - ${e}`);
    }
}

function onSockPermanentBan(data) {
    try {
        var client = servman.getClient(this.id);
        if( !client ) return;
        var toBanClient = data.sockid != '' ? servman.getClient(data.sockid) :  connListMan.getUser(data.nick);
        if( !toBanClient ) return;
        var socket = client.socket;
        if( !client.isAdmin() ) return;

        if( !client.isLogined() ) {
            sendServerMsg(socket, '손님은 밴 기능을 사용할 수 없습니다. 가입 후 사용 해 주세요.');
            return;
        }

        if( client.ip == toBanClient.ip ) {
            //sendServerMsg(socket, '자신을 신고할 수 없습니다.');
            //return;
        }

        dbhelper.updateBanUser(toBanClient.ip, ret => {
            sendServerMsg(socket, `${toBanClient.nick} 영구밴 완료!`);
            toBanClient.socket.emit('reconn-server', {logined: toBanClient.isLogined(), url: 'jamlive.net'});
            chatMan.Broadcast(servman.io, client, 'ban', `${toBanClient.ip}을 영구밴 시켰습니다`, false);
            console.log('permanent ban success - ip');

            dbhelper.getPermanentBanList(function(ret) {
                if( ret.ret == 0 ) {
                    console.log('getPermanentBanList success : ' + ret.ret);
                    servman.permanentBanList = ret.list;
                }
                else {
                    console.log('getPermanentBanList error : ' + ret.ret);
                }
            });
        });
        if( toBanClient.isLogined() && toBanClient.socket.handshake.session.username ){
            dbhelper.updateBanUser( toBanClient.socket.handshake.session.username, ret => {
                sendServerMsg(socket, `${toBanClient.nick} 영구밴 완료!`);
                toBanClient.socket.emit('reconn-server', {logined: toBanClient.isLogined(), url: 'jamlive.net'});
                chatMan.Broadcast(servman.io, client, 'ban', `${toBanClient.nick}님을 영구밴 시켰습니다`, false);
                console.log('permanent ban success - nick');

                dbhelper.getPermanentBanList(function(ret) {
                    if( ret.ret == 0 ) {
                        console.log('getPermanentBanList success : ' + ret.ret);
                        servman.permanentBanList = ret.list;
                    }
                    else {
                        console.log('getPermanentBanList error : ' + ret.ret);
                    }
                });
            } );
        }

        //servman.io.sockets.emit('chat', {sockid: '', id: '', nickname: client.nick, msg: '[BAN] ' + toBanClient.nick + ' 님이 영구밴 당하셨습니다', mode: "ban", isBaned: '', admin: client.isAdmin(), isLogin: client.isLogined(), auth: client.auth, ip: client.ip });

    }
    catch(e) {
        console.log(`onSockPermanentBan error - ${e}`);
    }
}

function onSockLike(data) {
    try {
        var client = servman.getClient(this.id);
        if( !client ) return;
        var toLikeClient = data.sockid != '' ? servman.getClient(data.sockid) :  connListMan.getUser(data.nick);
        if( !toLikeClient ) return;
        var socket = client.socket;
        var logined = socket.handshake.session.username ? true : false;
        var auth_state = logined ? socket.handshake.session.auth : -1;

         if( client.ip == toLikeClient.ip ) {
             sendServerMsg(client.socket, '스스로 칭찬 불가능');
         return;
         }

        var tCur = new Date();
        if( tCur - toLikeClient.tLastClick >= 40000 ) {
            sendServerMsg(client.socket, '칭찬은 상대의 퀴즈 투표 후에');
            return;
        }

        if( !isLiveQuizTime() ) {
            sendServerMsg(client.socket, '라이브 퀴즈 시간대가 아니면 칭찬 불가');
            return;
        }

        const msg = [
            `${toLikeClient.nick}님! 당신은 최고에요!`,
            `${toLikeClient.nick}님 덕분에 살았습니다`,
            `${toLikeClient.nick}님 사랑해요 ♡`,
            `퀴즈의 지배자 ${toLikeClient.nick}님 ♡ㅅ♡`,
            `${toLikeClient.nick}님 매우 칭찬해~`,
        ];

        const curMsg = msg[Math.floor(Math.random() * 5)];

        toLikeClient.activePoint += 5;

        servman.io.sockets.emit('chat', {sockid: this.id, id: '', nickname: client.nick, msg: `<like>[칭찬] ${curMsg}</like>`, mode: "ban", isBaned: '', admin: client.isAdmin(), isLogin: logined, auth: auth_state, ip: client.ip });
    }
    catch(e){
        console.log(`onSockLike exception : ${e}`);
    }
}

function onSockSearch(data) {
    try {
        var client = servman.getClient(this.id);
        if( !client ) return;
        var socket = client.socket;
        var logined = socket.handshake.session.username ? true : false;

        if( isLiveQuizTime() ) {
            client.activePoint += 3;
        }

        client.tLastSearch = new Date();

        if( data.isBroadcast ) {
            var nick = client.nick;
            servman.addSearchQuery( data.msg, true );
        }
        else {
            servman.addSearchQuery( data.msg, false );
        }
    }catch( e ) {
        console.log(`onSockSearch Error - ${e}`);
    }
}

function onSockChat(data) {
    try {
        var client = servman.getClient(this.id);
        if( !client ) return;
        var socket = client.socket;

        var mode = 'chat';
        var isBaned = false;
        if( servman.checkBaned( client.ip ) ) {
            isBaned = true;
        }

        if( client == null ) {
            //this.disconnect();
            return;
        }

        var logined = client.isLogined();
        var nick = client.nick;
        var auth_state = client.auth;

        if( servman.checkBaned(client.ip) ) {
            sendServerMsg(socket, '밴유저는 채팅 참여가 불가능합니다.');
            return;
        }

        if( !client.isAbleChat() ) {
            sendServerMsg(socket, '여유를 가지고 채팅 해 주세요.');
            return;
        }

        client.tLastChat = new Date();

        if( ( client.isAdmin() || (auth_state && auth_state >= 3)) && !quizAnalysis.isQuizDataEngaged() && data.msg == "#quiz") {
            dbhelper.getRandomQuiz(function(result) {
                if( result.ret == 0 ){
                    servman.createQuizData(client.nick, result.quizdata);
                }
            });
            return;
        }

        if( data.mode == "emoticon" ) {
            servman.io.sockets.emit('emoticon', {auth: client.auth, nick: nick, name: data.emoticon});
            return;
        }

        if( !logined ) {
            const msg = [
                `(속닥속닥) 무언가 말하고 있습니다...`,
                `(속닥속닥) 무슨 말을 하고 있는걸까요...`,
                `(속닥속닥) 제 말이 들리시나요..`,
                `(속닥속닥) 답답하네요 ㅠ`,
                `(속닥속닥) 가입을 해야겠어요..`,
            ];

            const curMsg = msg[Math.floor(Math.random() * 5)];
            data.msg = curMsg;
        }

        chatMan.Broadcast( servman.io, client, 'chat', data.msg, isBaned );
    }
    catch(err) {
        console.error(err);
    }
}

function isLiveQuizTime() {
    var cur = new Date();
    var hours = cur.getHours();
    return !( (hours >= 23 || hours < 12 ) || (hours >= 15 && hours < 19 ) );
}

function onSockVote(data) {
    try {
        var client = servman.getClient(this.id);
        if( !client ) {
            return;
        }
        var socket = client.socket;

        if( servman.checkBaned( client.ip ) ) {
            sendServerMsg(socket, '다수의 신고로 인해 일시적으로 투표에서 제외되었습니다.');
            return;
        }

        if( isLiveQuizTime() && client.auth < 2 && !client.isInSearchedUser() ) {
            sendServerMsg(socket, '레벨 2 미만의 회원은 검색 후 투표가능합니다.');
            return;
        }

        if( !client.isLogined() ) {
            var _counts = [0,0,0];
            servman.counts.forEach(function(value, key) {
                _counts[0] += value[0];
                _counts[1] += value[1];
                _counts[2] += value[2];
            })

            var total = _counts[0] + _counts[1] + _counts[2];

            if( isLiveQuizTime() && total <= 0 ) {
                sendServerMsg(socket, '손님은 회원 투표 전까지 투표 불가능합니다.');
                return;
            }
        }

        if( client.isClickable() ) {
            servman.click(data.idx, !client.isLogined(), client.isInSearchedUser());

            if( quizAnalysis.isQuizDataEngaged() ) {
                quizAnalysis.vote(client, data.idx);
                client.activePoint += 1;
            }

            if( servman.quizdata && !servman.quizdata.isEnd() ) {
                servman.quizdata.vote(data.idx);
            }
            if( socket.handshake.session.username && socket.handshake.session.auth >= 1 ) {
                servman.click(data.idx, !client.isLogined(), client.isInSearchedUser());
            }
            client.tLastClick = new Date();

            var number = Number(data.idx) + 1;

            var nick = client.nick;

            if( isLiveQuizTime() ) {
                client.activePoint += 2;
            }

            chatMan.Broadcast(servman.io, client, 'vote', `[투표] ${number}번!`, false, data.idx );
        }
        else {
            sendServerMsg(socket, '투표한지 얼마 안됐어요. 나중에 시도하세요.');
        }
    }
    catch(e) {
        console.log(`onSockVote - Error ${e}`);
    }
}

function onAnalysis(data) {
    var client = servman.getClient(this.id);
    if( !client ) return;
    var socket = client.socket;
    var logined = socket.handshake.session.username ? true : false;
    var auth_state = logined ? socket.handshake.session.auth : -1;

    if( !client.isAdmin() ) {
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

function onMemo(data) {
    try {
        var client = servman.getClient(this.id);
        if( !client ) return;

        if( client.auth < 3 ) {
            sendServerMsg(client.socket, '등급이 낮아 힌트 제공이 불가능합니다');
            return;
        }

        if( data.mode == 'isUsable' ) {
            var bAble = false;
            if( servman.bMemoModifying ) {
                sendServerMsg(client.socket, `${servman.modifyingUser}님이 수정 중입니다.`);
            }
            else {
                bAble = true;
                servman.modifyingUser = client.nick;
                    servman.bMemoModifying = true;
            }
            if(client.socket)
                client.socket.emit('memo', {mode: data.mode, isAble: bAble, modifier: servman.modifyingUser });
            return;
        }
        else if( data.mode == 'cancel' ) {
            servman.modifyingUser = '';
            servman.bMemoModifying = false;
            if(client.socket)
                client.socket.emit('memo', {mode: data.mode });
            return;
        }

        servman.bMemoModifying = false;
        servman.modifyingUser = '';
        servman.memo = data.memo;
        servman.memo_provider = client.nick;
        servman.io.sockets.emit('memo', {memo_provider: servman.memo_provider , memo: servman.memo });
    }
    catch(e) {

    }
}

function sendServerMsg( socket, msg ) {
    try {
        socket.emit('serv_msg', {msg: msg});
    }
    catch(e) {
        console.log(`sendServerMsg Error - ${e}`);
    }
}


module.exports = servman;
