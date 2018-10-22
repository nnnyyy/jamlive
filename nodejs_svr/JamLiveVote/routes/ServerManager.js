/**
 * Created by nnnyy on 2018-05-10.
 */
var HashMap = require('hashmap');
var Client = require('./client');
require('./StringFunction');
var dbhelper = require('./dbhelper');
var quizAnalysis = require('./quizAnalysis');

var chatMan = require('./modules/chatMan');
var Chosung = require('./modules/chosungGame');
var KinMan = require('./modules/KinManager');
const VoteMan = require('./modules/voteManager');
const SearchMan = require('./modules/searchManager');
const WebSearchEngine = require('./modules/webSearchEngine');
const LevelExpTable = require('./modules/LevelExpTable');
const PS = require('../Common/PacketProtocols');
const AutoQuizManager = require('../server/modules/AutoQuizManager');
const CenterServer = require('../server/modules/Center');
const OnePickManager = require('../server/modules/OnePickManager');

var config = require('../config');

const connectedListMan = require('./modules/ConnectedListMan');
const connListMan = new connectedListMan();

var VOTEPERTIME = 1000;
var BANTIME = 6 * 60 * 1000;
var SEARCHTIME = 8 * 1000;
var BANCNT = 4;

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

    this.voteManager = new VoteMan();
    this.searchManager = new SearchMan();
    this.webSearchMan = new WebSearchEngine(this);

    this.onePickManager = new OnePickManager(this);

    this.todayQuizTableList = [];

    this.curDay = -1;
    this.tLastUpdateQuizTimeTable = 0;
    this.totalVote = [0,0,0,0];
    this.totalUserCnt = 0;

    this.searchQueries = [];

    this.globalHint = {
        isModifying: false,
        modifier: '',
        hint: '',
        provider: ''
    }
}

var servman = new ServerMan();

ServerMan.prototype.isLiveQuizTime = function() {
    var cur = new Date();
    var hours = cur.getHours();
    return !( (hours >= 23 || hours < 12 ) || (hours >= 15 && hours < 18 ) );
}

ServerMan.prototype.setAllServerVote = function( totalVote ) {
    this.totalVote = totalVote;
}

ServerMan.prototype.setTotalUserCnt = function( totalCnt ) {
    this.totalUserCnt = totalCnt;
}

ServerMan.prototype.setSearchQueries = function( searchQueries ) {
    this.searchQueries = searchQueries;
}

ServerMan.prototype.reloadBanList = function() {
    dbhelper.getPermanentBanList(function(ret) {
        if( ret.ret == 0 ) {
            console.log('reloadBanList success : ' + ret.ret);
            servman.permanentBanList = ret.list;
        }
        else {
            console.log('reloadBanList error : ' + ret.ret);
        }
    });
}

ServerMan.prototype.sendServerMsg = function( socket, msg ) {
    try {
        socket.emit('serv_msg', {msg: msg});
    }
    catch(e) {
        console.log(`sendServerMsg Error - ${e}`);
    }
}

ServerMan.prototype.updateInfo = function( socket, client ) {
    try {
        if( !socket || !client ) return;

        socket.emit(PS.SERV_TO_CLIENT.UPDATE_INFO, { ap: client.getActivePoint(), auth: client.auth })
    }
    catch(e) {
        console.log('update info error');
    }
}

ServerMan.prototype.register = function(socket) {
    if( !this.addSocket(socket) ) {
        return;
    }

    var client = servman.getClient(socket.id);

    socket.on('disconnect', function(){
        var client = servman.getClient(this.id);
        servman.removeSocket(this.id);

        //  힌트 수정자를 취소 시키기 위한 로직
        servman.center.disconnectUser( client.nick );

        if( client && client.isLogined() ) {
            if( servman.modifyingUser == client.nick ) {
                servman.modifyingUser = '';
                servman.bMemoModifying = false;
            }
            //  DB에 바로 업데이트하는 건 별로니, 나중에는 큐로 쌓고 처리하자
            const userinfo = JSON.stringify(client.socket.handshake.session.userinfo);
            servman.redis.set(client.socket.handshake.session.username, userinfo,  (err, info) => {
            } )

            dbhelper.updateActivePoint( this.handshake.session.username, client.getActivePoint(), function(ret) {
                //console.log(`${client.nick} - updateActivePoint ret ${ret}`);
            });
        }
    });

    if( client.isLogined() ) {
        client.auth = socket.handshake.session.userinfo.auth;
    }

    if( isServerLimit() && !client.isAdminMembers() ) {
        socket.emit('reconn-server', {reason: 'limit', url: 'jamlive.net'});
        return;
    }

    //  서버를 강제로 이동해도 이 그룹에 속하지 않으면 받을 수 없다.
    socket.join('auth');

    var rd = Math.floor(Math.random() * 500);
    var nick = client.isLogined() ? socket.handshake.session.userinfo.usernick : '';
    if( !client.isLogined() ){
        nick = '손님' + rd;
    }

    client.nick = nick;

    connListMan.addUser(client);
    connListMan.updateListToClient(client);

    if( client.isLogined() ) {
        while( LevelExpTable.isAbleLevelUp(client.auth, client.getActivePoint() ) ) {
            client.auth += 1;
            client.getUserInfo().auth += 1;
            dbhelper.updateAuth( client.getUserId(), client.auth, function( result ) {
                servman.sendServerMsg(client.socket, `레벨 업!!`);
                servman.updateInfo(client.socket, client );
            } );
        }
    }

    socket.emit(PS.SERV_TO_CLIENT.LOGIN_INFO, {socket: socket.id, isLogined: client.isLogined(), isAdminMembers: client.isAdminMembers() , auth: client.auth, nick: client.nick, quizTable: servman.todayQuizTableList, statistics: servman.rankerList });
    var localMemoObj = { hint: servman.memo, provider: servman.memo_provider }
    var MemoObj = { hint: this.globalHint.hint, provider: this.globalHint.provider }
    socket.emit(PS.SERV_TO_CLIENT.GLOBAL_HINT, { mode: 'set', global: MemoObj })
    socket.emit(PS.SERV_TO_CLIENT.LOCAL_HINT, {memo_provider: servman.memo_provider , local: localMemoObj });
    socket.emit(PS.SERV_TO_CLIENT.UPDATE_NOTICE, {noticeData: this.noticeData});

    socket.emit('next-quiz', { data: servman.nextQuizShowdata });

    if( this.chosung.isRunning() ) {
        this.chosung.sendState(socket);
    }

    socket.on(PS.CLIENT_TO_SERV.VOTE, onSockVote);
    socket.on(PS.CLIENT_TO_SERV.CHAT, onSockChat);
    socket.on(PS.CLIENT_TO_SERV.SEARCH, onSockSearch);
    socket.on(PS.CLIENT_TO_SERV.BAN, onSockBan);
    socket.on(PS.CLIENT_TO_SERV.PERMANENT_BAN, onSockPermanentBan);
    socket.on(PS.CLIENT_TO_SERV.LIKE, onSockLike);
    socket.on(PS.CLIENT_TO_SERV.LOCAL_HINT, onMemo);
    socket.on(PS.CLIENT_TO_SERV.SELECT_SERVER, onGo);
    socket.on(PS.CLIENT_TO_SERV.GET_VOTE_LIST, onGetVoteList);
    socket.on(PS.CLIENT_TO_SERV.GET_SEARCH_LIST, onGetSearchList);

    socket.on(PS.CLIENT_TO_SERV.SERV_INFO_RELOAD, onServerInfoReload);
    socket.on(PS.CLIENT_TO_SERV.BAN_RELOAD, onBanReload);
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

        const client = new Client(this, socket);
        client.ip = ip;
        this.socketmap.set(socket.id, client);

        if( client.isLogined() ) {
            this.redis.get(client.socket.handshake.session.username, (err, info) => {
                try {
                    if( !err ) {
                        const parsedInfo = JSON.parse(info);
                        client.socket.handshake.session.userinfo = parsedInfo;
                        client.socket.emit('ap', {ap: parsedInfo.ap});
                    }
                }catch(e) {

                }
            } );
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

ServerMan.prototype.setIO = function(io, redis) {
    this.io = io;
    this.redis = redis;
    this.chatMan = chatMan;
    this.center = new CenterServer(this);

    this.isCleanServer = (config.type == 'clean');

    this.chosung = new Chosung(io);

    this.autoQuizManager = new AutoQuizManager(this);

    servman.redis.get('jamlive-memo-info:' + config.serv_name,  (err, info) => {
        try {
            if( !err ) {
                const memoinfo = JSON.parse(info);
                servman.memo = memoinfo.memo;
                servman.memo_provider = memoinfo.provider;
            }
        }catch(e) {

        }
    } );

    dbhelper.getStatistics(function(result) {
        servman.rankerList = result.list;
    });

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

    var cur = new Date();
    //  오늘의 퀴즈쇼 알림
    if( this.curDay != cur.getDay() ) {
        this.curDay = cur.getDay();
        dbhelper.getTodayQuizList(function(result) {
            servman.todayQuizTableList = result.tableList;
        })
    }

    setInterval(function() {
        servman.broadcastVoteInfo();
    }, 400);

    setInterval(function() {
        servman.updateLong();
    }, 3000);

    setInterval(function() {
        servman.updateVerySlow();
    }, 1000 * 60 * 30);
}

ServerMan.prototype.broadcastVoteInfo = function() {
    let cur = new Date();

    if( this.chosung.isRunning() ) {
        this.chosung.update( cur );
    }

    this.autoQuizManager.update(cur);
    this.onePickManager.update(cur);

    cur -= cur % VOTEPERTIME;
    cur /= VOTEPERTIME;

    if( this.counts.get(cur) == null ) {
        this.counts.set(cur, [0,0,0,0]);
        this.countslist.push(cur);
        if( this.counts.count() > 10 ) {
            this.counts.delete(this.countslist[0]);
            this.countslist.shift();
        }
    }

    if( this.countsForGuest.get(cur) == null ) {
        this.countsForGuest.set(cur, [0,0,0,0]);
        this.countslistForGuest.push(cur);
        if( this.countsForGuest.count() > 10 ) {
            this.countsForGuest.delete(this.countslistForGuest[0]);
            this.countslistForGuest.shift();
        }
    }

    if( this.countsSearchFirst.get(cur) == null ) {
        this.countsSearchFirst.set(cur, [0,0,0,0]);
        this.countslistSearchFirst.push(cur);
        if( this.countsSearchFirst.count() > 10 ) {
            this.countsSearchFirst.delete(this.countslistSearchFirst[0]);
            this.countslistSearchFirst.shift();
        }
    }

    let _counts = [0,0,0,0];
    let _countsForGuest = [0,0,0,0];
    let _countsSearchFirst = [0,0,0,0];

    this.counts.forEach(function(value, key) {
        _counts[0] += value[0];
        _counts[1] += value[1];
        _counts[2] += value[2];
        _counts[3] += value[3];
    })

    this.countsForGuest.forEach(function(value, key) {
        _countsForGuest[0] += value[0];
        _countsForGuest[1] += value[1];
        _countsForGuest[2] += value[2];
        _countsForGuest[3] += value[3];
    })

    this.countsSearchFirst.forEach(function(value, key) {
        _countsSearchFirst[0] += value[0];
        _countsSearchFirst[1] += value[1];
        _countsSearchFirst[2] += value[2];
        _countsSearchFirst[3] += value[3];
    })

    var searchlist = this.searchQueries;
    let s = '';
    for( var i = 0 ; i < searchlist.length ; ++i ) {
        s += searchlist[i].query;
    }

    let countForCenter = [0,0,0,0];
    countForCenter[0] = _counts[0] + _countsSearchFirst[0];
    countForCenter[1] = _counts[1] + _countsSearchFirst[1];
    countForCenter[2] = _counts[2] + _countsSearchFirst[2];
    countForCenter[3] = _counts[3] + _countsSearchFirst[3];


    this.center.sendUserCntInfo({cnt: this.socketmap.count(), voteCnts: countForCenter });
    this.io.sockets.in('auth').emit('vote_data', {vote_data: { cnt: _counts, totalCnt: this.totalUserCnt, totalVote: this.totalVote, searched_cnt: _countsSearchFirst, users: this.socketmap.count(), bans: this.banUsers.count()}, searchlist: searchlist, slhash: s.hashCode(), kin: KinMan.getList() });
}

ServerMan.prototype.click = function(idx, isGuest, isHighLevelUser) {
    var cur = new Date();
    cur -= cur % VOTEPERTIME;
    cur /= VOTEPERTIME;

    var _counts = isGuest ? this.countsForGuest : ( isHighLevelUser ? this.countsSearchFirst : this.counts );
    var _countslist = isGuest ? this.countslistForGuest : ( isHighLevelUser ? this.countslistSearchFirst : this.countslist );

    var obj = _counts.get(cur);
    if( obj == null ) {
        _counts.set(cur, [0,0,0,0]);
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

ServerMan.prototype.banUser = function( ip, byIp, banState ) {
    var bui = this.banMap.get( ip );
    if( bui == null ) {
        var newbui = new BanUserInfo();
        newbui.add(byIp);
        this.banMap.set(ip, newbui);

        if( newbui.isAbleBan() ) {
            this.banUsers.set( ip, Date.now() );
            this.banMap.delete( ip );
            banState.state = 2;
        }
        return true;
    }

    if( bui.add(byIp) ) {
        if( bui.isAbleBan() ) {
            this.banUsers.set( ip, Date.now() );
            this.banMap.delete( ip );
            banState.state = 2;
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

ServerMan.prototype.updateLong = function() {
    var cur = new Date();

    try {

        connListMan.updateCntByAuth();
        this.io.sockets.emit('update-cnts-by-auth', {arr: connListMan.getCntsByAuth() });

        //  오늘의 퀴즈쇼 알림
        if( cur - this.tLastUpdateQuizTimeTable >= 5 * 60 * 1000 ) {
            this.tLastUpdateQuizTimeTable = cur;
            dbhelper.getTodayQuizList(function(result) {
                servman.todayQuizTableList = result.tableList;
            })
        }

        //  지식의 바다
        KinMan.update( cur );

        if( config.autoQuiz ) {
            //  자동 초성 퀴즈
            if( this.chosung.isChosungTime(this) ) {
                this.chosung.start();
            }

            //  자동 퀴즈쇼 모드
            if( !this.chosung.isRunning() && !this.isLiveQuizTime() && this.autoQuizManager.canMakeQuiz() ) {
                this.autoQuizManager.makeQuiz('자동', function() {
                });
            }
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

ServerMan.prototype.updateVerySlow = function() {
    var cur = new Date();

    try {
        dbhelper.getStatistics(function(result) {
            servman.rankerList = result.list;
        });
    }catch(e) {
        console.log('updateVerySlow error : ' + e);
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

ServerMan.prototype.addSearchQuery = function( query, bCount ) {
    this.center.sendSearchQuery({ query: query, isCounting: bCount });
}

ServerMan.prototype.updateNotice = function( noticeData ) {
    this.noticeData = noticeData;
    servman.io.sockets.in('auth').emit('update-notice', {noticeData: noticeData});
}

function onSockBan(data) {
    try {
        var tCur = new Date();
        var client = servman.getClient(this.id);
        if( !client ) return;
        var toBanClient = data.sockid != '' ? servman.getClient(data.sockid) :  connListMan.getUser(data.nick);
        if( !toBanClient ) return;
        var socket = client.socket;
        var msg = '';

        if( !client.isLogined() ) {
            servman.sendServerMsg(socket, '손님은 밴 기능을 사용할 수 없습니다. 가입 후 사용 해 주세요.');
            return;
        }

        if( data.type == 'wrongVote' && toBanClient.getLastVote(tCur) == -1) {
            servman.sendServerMsg(socket, '오투표 신고는 1분 내에 해주세요');
            return;
        }

        if( client.ip == toBanClient.ip ) {
            servman.sendServerMsg(socket, '자신을 신고할 수 없습니다.');
            return;
        }

        if( servman.checkBaned(client.ip) ) {
            servman.sendServerMsg(socket, '밴유저는 다른 유저를 밴 할 수 없습니다.');
            return;
        }

        if( servman.checkBaned( toBanClient.ip ) ) {
            servman.sendServerMsg(socket, '이미 밴 되어 있습니다.');
            return;
        }

        toBanClient.incActivePoint( -10 );

        var banState = { state: -1 };
        if( servman.banUser(toBanClient.ip, client.ip, banState) ) {
            chatMan.Broadcast(servman.io, client, 'ban', `[BAN] ${toBanClient.nick}님을 신고 했습니다.`, false);
            msg = '밴 신청 완료';
            client.incActivePoint( 3 );
            if( banState.state == 2 && toBanClient.isLogined() ) {
                toBanClient.incBanCnt();
            }
        }
        else {
            msg = '동일 유저에게 신고할 수 없습니다.';
        }

        servman.sendServerMsg(socket, msg);
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
            servman.sendServerMsg(socket, '손님은 밴 기능을 사용할 수 없습니다. 가입 후 사용 해 주세요.');
            return;
        }

        if( client.ip == toBanClient.ip ) {
            //sendServerMsg(socket, '자신을 신고할 수 없습니다.');
            //return;
        }

        dbhelper.updateBanUserIP(toBanClient.ip, ret => {
            servman.sendServerMsg(socket, `${toBanClient.nick} 영구밴 완료!`);
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
        if( toBanClient.isLogined() && toBanClient.getUserId() ){
            dbhelper.updateBanUserID( toBanClient.getUserId(), ret => {
                servman.sendServerMsg(socket, `${toBanClient.nick} 영구밴 완료!`);
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
        var auth_state = logined ? client.auth : -1;

         if( client.ip == toLikeClient.ip ) {
             servman.sendServerMsg(client.socket, '스스로 칭찬 불가능');
         return;
         }

        var tCur = new Date();
        if( tCur - toLikeClient.tLastClick >= 40000 ) {
            servman.sendServerMsg(client.socket, '칭찬은 상대의 퀴즈 투표 후에');
            return;
        }

        if( !servman.isLiveQuizTime() ) {
            servman.sendServerMsg(client.socket, '라이브 퀴즈 시간대가 아니면 칭찬 불가');
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

        toLikeClient.incActivePoint( 5 );
        insertLike(toLikeClient, client);

        servman.io.sockets.in('auth').emit('chat', {sockid: this.id, id: '', nickname: client.nick, msg: `<like>[칭찬] ${curMsg}</like>`, mode: "ban", isBaned: '', admin: client.isAdmin(), isLogin: logined, auth: auth_state, ip: client.ip });
    }
    catch(e){
        console.log(`onSockLike exception : ${e}`);
    }
}

function insertLike( toLikeClient, client ) {
    try {
        dbhelper.insertLike( toLikeClient.getUserName() );
    }
    catch(e) {
        console.log(e);
    }
}

function onSockSearch(data) {
    try {
        const tCur = new Date();
        var client = servman.getClient(this.id);
        if( !client ) return;
        var logined = client.isLogined();
        if( !logined )
        {
            servman.sendServerMsg(client.socket, '검색기능은 로그인 후 사용 가능합니다.');
            return;
        }

        var tMax = 10000;
        if( client.auth <= 1 ) tMax = 10000;
        else if( client.auth >= 2 && client.auth < 5 ) tMax = 3000;
        else tMax = 500;

        if( tCur - client.tLastSearch < tMax ) {
            servman.sendServerMsg(client.socket, `${( tMax - ( tCur - client.tLastSearch)) / 1000 }초 후에 다시 시도해주세요.`);
            return;
        }

        servman.searchManager.search(client, data.msg);

        if( data.searchDic )
            servman.webSearchMan.searchDic(data.msg, client);
        if( client.auth >= 4 ) {
            var bSearch = false;
            for( var i = 0 ; i < data.searchNaverMainAPI.length ; ++i ) {
                if( data.searchNaverMainAPI[i] ) {
                    bSearch = true;
                    break;
                }
            }
            if( bSearch ) {
                servman.webSearchMan.searchNaverAPIs(data.msg, client, data.searchNaverMainAPI);
            }
        }

        if( data.searchDaum )
            servman.webSearchMan.searchDaum(data.msg, client);
        if( data.searchImage )
            servman.webSearchMan.searchImage(data.msg, client);

        if( client.auth < 1 && servman.isLiveQuizTime() ) {
            client.incActivePoint( 6 );
        }

        client.tLastSearch = new Date();

        if( data.isBroadcast ) {
            dbhelper.searchKinWordPerfect(data.msg, function(result) {
                if( result.ret == 0 && result.list.length > 0 ) {

                }
                else {
                    dbhelper.searchKinWord(data.msg, 0, function(result) {
                        if( result.ret == 0 && result.list.length > 0 ) {

                        }
                        else {
                            dbhelper.searchKinWord(data.msg, 1, function(result) {

                            });
                        }
                    });
                }
            });

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
        if( data.msg == 'slot') {
            servman.onePickManager.challenge();
            return;
        }

        var client = servman.getClient(this.id);
        if( !client ) return;
        var socket = client.socket;

        var mode = 'chat';
        var isBaned = false;
        if( servman.checkBaned( client.ip ) ) {
            isBaned = true;
        }

        if( client == null ) {
            return;
        }

        var logined = client.isLogined();
        var nick = client.nick;
        var auth_state = client.auth;

        if( !logined ) {
            servman.sendServerMsg(socket, '가입 후 채팅 가능');
            return;
        }

        if( !client.isAbleChat() ) {
            servman.sendServerMsg(socket, '여유를 가지고 채팅 해 주세요.');
            return;
        }

        client.tLastChat = new Date();

        if( client.isAdmin() && data.msg == "#quizoff") {
            chatMan.Broadcast( servman.io, client, 'chat', '자동퀴즈모드를 off 했습니다.', isBaned );
            return;
        }
        else if( client.isAdmin() && data.msg == "#quizon" ) {
            chatMan.Broadcast( servman.io, client, 'chat', '자동퀴즈모드를 on 했습니다.', isBaned );
            return;
        }
        else if( client.isAdmin() && data.msg == "#chosung") {
            servman.chosung.start();
            return;
        }
        else if( client.isAdmin() && data.msg == "#chosungoff" ) {
            servman.chosung.stop();
            return;
        }
        else if( client.isAdminMembers() && data.msg == "#freeze") {
            chatMan.setFreeze();
            chatMan.Broadcast( servman.io, client, 'chat', '-- 과열 방지를 위해 채팅창을 얼렸습니다 --', false );
            return;
        }

        if( data.msg == "#quiz" ) {
            if( !config.autoQuiz ) {
                servman.sendServerMsg(client.socket, '퀴즈를 낼 수 없는 서버 입니다.');
                return;
            }
            if( ( client.isAdmin() || (auth_state && auth_state >= 4) )
                && !servman.chosung.isRunning() && servman.autoQuizManager.canMakeQuiz() ) {
                servman.autoQuizManager.makeQuiz(nick, function() {
                });
                return;
            }
            else {
                servman.sendServerMsg(client.socket, '퀴즈를 낼 수 없습니다.');
                return;
            }
        }

        if( data.mode == "emoticon" ) {
            servman.io.sockets.in('auth').emit('emoticon', {auth: client.auth, nick: nick, name: data.emoticon, ip: client.ip});
            return;
        }

        if( servman.chosung.isRunning() ) {
            if( servman.chosung.checkAnswer(client.nick, data.msg) ) {
                //  성공 !
                client.incActivePoint(5);
                servman.sendServerMsg(client.socket, '+5점 획득!');
            }
        }

        //  채팅창 얼리기 시에는 메시지를 보내지 않는다.
        if( chatMan.isFreeze(new Date()) ) {
            servman.sendServerMsg(client.socket, '채팅창이 얼었습니다. 약 3분간 지속됩니다.');
            return;
        }

        chatMan.Broadcast( servman.io, client, 'chat', data.msg, isBaned );
    }
    catch(err) {
        console.error(err);
    }
}

function onSockVote(data) {
    try {
        var client = servman.getClient(this.id);
        if( !client ) {
            return;
        }
        var socket = client.socket;

        if( servman.checkBaned( client.ip ) ) {
            servman.sendServerMsg(socket, '다수의 신고로 인해 일시적으로 투표에서 제외되었습니다.');
            return;
        }

        var banCnt = client.getBanCnt();

        if( servman.isCleanServer && ( client.auth < 3 || banCnt >= 3 ) ) {
            if( servman.autoQuizManager.isVote() ) {
                //  자동 퀴즈가 나오면 투표 가능하도록
            }
            else {
                servman.sendServerMsg(socket, '이 서버에서는 레벨3 이하나 일정 이상 밴 당한 유저는 투표에 참여 불가능합니다.');
                return;
            }
        }

        if( !client.isLogined() ) {
            var _counts = [0,0,0,0];
            servman.counts.forEach(function(value, key) {
                _counts[0] += value[0];
                _counts[1] += value[1];
                _counts[2] += value[2];
                _counts[3] += value[3];
            })

            var total = _counts[0] + _counts[1] + _counts[2] + _counts[3];

            if( servman.isLiveQuizTime() && total <= 0 ) {
                servman.sendServerMsg(socket, '손님은 회원 투표 전까지 투표 불가능합니다.');
                return;
            }
        }

        var number = Number(data.idx) + 1;
        var nick = client.nick;

        if( client.isClickable() ) {
            if( servman.isLiveQuizTime() && client.auth < 2 ) {
                client.incActivePoint( 4 );
                var msgLowLevel = `[투표] ${number}번`;
                chatMan.Broadcast(servman.io, client, 'vote', msgLowLevel, false, -1 );
                client.lastVoteIdx =  data.idx;
                client.tLastClick = new Date();
                return;
            }
            servman.voteManager.vote(client, data.idx);
            servman.click(data.idx, !client.isLogined(), client.isHighLevelUser());

            if( servman.autoQuizManager.isVote() ) {
                servman.autoQuizManager.vote( client, data.idx);
                client.incActivePoint( 2 );
            }

            if( client.isHighLevelUser() && banCnt <= 0 ) {
                servman.click(data.idx, !client.isLogined(), client.isHighLevelUser());
                client.incActivePoint( 2 );
            }
            client.lastVoteIdx =  data.idx;
            client.tLastClick = new Date();

            if( servman.isLiveQuizTime() && servman.socketmap.count() >= 200 ) {
                client.incActivePoint( 2 );
            }

            var clientMsg = `[투표] ${number}번!`;
            if( banCnt >= 2 )
                clientMsg = `[투표] ${number}번  ...  밴을 ${banCnt}번 당한 유저`;

            chatMan.Broadcast(servman.io, client, 'vote', clientMsg, false, banCnt >= 2 ? -1 : data.idx );
        }
        else {
            servman.sendServerMsg(socket, '투표한지 얼마 안됐어요. 나중에 시도하세요.');
        }
    }
    catch(e) {
        console.log(`onSockVote - Error ${e}`);
    }
}

ServerMan.prototype.onGlobalHint = function( packet ) {
    switch( packet.mode ) {
        case 'isUsable':
        {
            const client = servman.getClient(packet.id);
            if( !client ) {
                console.log(`not found user : ${packet.id}`);
                return;
            }

            if( packet.ret == 0 ) {
                this.globalHint.modifier = packet.desc.modifier;
                this.globalHint.isModifying = true;
            }

            const oPacket = {mode: packet.mode, isAble: packet.desc.isAbleModify, modifier: packet.desc.modifier };
            client.socket.emit('global-memo', oPacket);
            break;
        }

        case 'cancel':
        {
            this.globalHint.modifier = '';
            this.globalHint.isModifying = false;

            if( packet.id != '' ) {
                const client = servman.getClient(packet.id);
                if( !client ) return;
                const oPacket = {mode: packet.mode };
                client.socket.emit('global-memo', oPacket);
            }
            break;
        }

        case 'set':
        {
            this.globalHint.provider = packet.desc.provider;
            this.globalHint.hint = packet.desc.hint;
            this.globalHint.modifier = '';
            this.globalHint.isModifying = false;
            var MemoObj = { hint: this.globalHint.hint, provider: this.globalHint.provider }
            servman.io.sockets.in('auth').emit('global-memo', { mode: packet.mode, global: MemoObj });
            break;
        }

    }
}

function onMemo(data) {
    try {
        var client = servman.getClient(this.id);
        if( !client ) return;

        if( data.type == 'global' ) {
            if( !client.isAdminMembers() ) {
                servman.sendServerMsg(client.socket, '권한이 없습니다');
                return;
            }
            if( data.mode == 'isUsable' && servman.globalHint.isModifying ) {
                servman.sendServerMsg(client.socket, `${servman.globalHint.modifier}님이 수정 중입니다.`);
                return;
            }
            data.id = client.socket.id;
            data.nick = client.nick;
            servman.center.socket.emit('global-hint', data);
        }
        else if ( data.type == 'local') {

            if( client.auth < 4 ) {
                servman.sendServerMsg(client.socket, '등급이 낮아 힌트 제공이 불가능합니다');
                return;
            }

            if( data.mode == 'isUsable' ) {
                var bAble = false;
                if( servman.bMemoModifying ) {
                    servman.sendServerMsg(client.socket, `${servman.modifyingUser}님이 수정 중입니다.`);
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

            const memoinfo = JSON.stringify({memo: servman.memo, provider: servman.memo_provider });
            servman.redis.set('jamlive-memo-info:' + config.serv_name, memoinfo,  (err, info) => {
            } );

            var localMemoObj = { hint: servman.memo, provider: servman.memo_provider }
            servman.io.sockets.in('auth').emit('memo', {memo_provider: servman.memo_provider , local: localMemoObj });

        }
    }
    catch(e) {

    }
}

function onGo(data) {
    try {
        var client = servman.getClient(this.id);
        if( !client ) return;

        var tCur = new Date();

        if( !servman.center.servnameConvert.has(data.servidx) ) {
            client.socket.emit('go', {ret: -1, msg: '서버 오류'});
            return;
        }
        else {
            const servRealName = servman.center.servnameConvert.get(data.servidx);
            if( !servman.center.servInfoList.has(servRealName) ) {
                client.socket.emit('go', {ret: -1, msg: '서버가 죽었어요. 다른 서버로'});
                return;
            }

            var servinfo = servman.center.servInfoList.get(servRealName);
            if( tCur - servinfo.tLastRecv >= 5000 ) {
                client.socket.emit('go', {ret: -1, msg: '서버가 죽었어요. 다른 서버로'});
                return;
            }

            if( servinfo.cnt >= servinfo.limit && !client.isAdminMembers() ) {
                client.socket.emit('go', {ret: -1, msg: '서버에 인원이 너무 많아요. 다른서버로.'});
                return;
            }

            client.socket.emit('go', {ret: 0, url: servinfo.url});
        }
    }catch(e) {
        console.log(e);
    }
}

function isServerLimit() {
    var servinfo = servman.center.servInfoList.get(config.serv_name);
    if( !servinfo ) return true;

    if( servinfo.cnt >= servinfo.limit ) {
        return true;
    }

    return false;
}

function onServerInfoReload(data) {
    var client = servman.getClient(this.id);
    if( !client ) return;

    if( !client.isAdmin() ) {
        return;
    }

    servman.center.socket.emit('server-info-reload', {});
}

function onBanReload(data) {
    var client = servman.getClient(this.id);
    if( !client ) return;

    if( !client.isAdmin() ) {
        return;
    }

    servman.center.socket.emit('ban-reload', {});
}

function onGetVoteList(packet) {
    var client = servman.getClient(this.id);
    if( !client ) return;

    const list = servman.voteManager.getVoteList();
    this.emit('get-vote-list', list);
}

function onGetSearchList(packet) {
    var client = servman.getClient(this.id);
    if( !client ) return;

    const list = servman.searchManager.getSearchList();
    this.emit('get-search-list', list);
}


//  프로세스 종료 시 유저 데이터 저장
process.on('SIGINT', () => {
    console.info('SIGTERM signal received.');
    process.exit();
});

module.exports = servman;