/**
 * Created by nnnyy on 2018-05-10.
 */
var HashMap = require('hashmap');
var Client = require('./client');
var ChatRoom = require('./chatroom');
var sf = require('./StringFunction');
var dbhelper = require('./dbhelper');

var VOTEPERTIME = 1000;
var BANTIME = 2 * 60 * 1000;
var SEARCHTIME = 8 * 1000;
var BANCNT = 3;

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
    this.searched = new HashMap();
    this.countslist = [];
}

var servman = new ServerMan();

ServerMan.prototype.addSocket = function(socket) {
    this.socketmap.set(socket, new Client(socket));
    this.uniqueip.set(socket.handshake.address, 1);
    //console.log('user connected : ' + socket.handshake.headers['x-real-ip']);
}

ServerMan.prototype.removeSocket = function(socket) {
    if( this.socketmap.get(socket) == null ) {
        console.log('Error');
        return;
    }

    this.socketmap.delete(socket);
    this.uniqueip.delete(socket.handshake.address);
    //console.log('user disconnected : ' + socket.handshake.headers['x-real-ip']);
}

ServerMan.prototype.getClient = function(socket){
    return this.socketmap.get(socket);
}

ServerMan.prototype.setIO = function(io) {
    this.io = io;
    this.chatroom = new ChatRoom(io);

    /*
    setInterval(function() {
        servman.broadcastVoteInfo();
    }, 300);
    */

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

    this.io.sockets.emit('vote_data', {cnt: JSON.stringify(this.counts), users: this.socketmap.count(), bans: this.banUsers.count()})
}

ServerMan.prototype.sendVoteData = function(socket) {
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

    socket.emit('vote_data', {cnt: JSON.stringify(this.counts), users: this.socketmap.count(), bans: this.banUsers.count()});
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

        this.searched.forEach(function(val, key) {
            if( cur - val.tLast > SEARCHTIME) {
                servman.searched.delete(key);
            }
        })
    }catch(e) {
        console.log(e);
    }
}

ServerMan.prototype.getSearchedData = function(query) {
    var d = this.searched.get(query);
    if( d != null ) {
        return d.data;
    }

    return null;
}

ServerMan.prototype.setSearchedData = function(query, data) {
    var d = this.searched.get(query);
    if( d ) {
        d.tLast = new Date();
        this.searched.set(query, d);
        return;
    }

    this.searched.set(query, {data: data, tLast: new Date()});
}


ServerMan.prototype.register = function(socket) {
    this.addSocket(socket);

    socket.emit('myid', {socket: socket.id});

    socket.on('disconnect', function(){
        servman.chatroom.leave(this);
        servman.removeSocket(this);
    });

    //  get vote data
    socket.on('gvd', function() {
        servman.sendVoteData(this);
    })

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
            client.tLastClick = new Date();

            var number = Number(data.idx) + 1;

            servman.io.sockets.emit('chat', {id: this.id, hash: ipHashed, nickname: data.nickname + '(' + ip + ')', msg: '[투표] ' + number, mode: "vote", vote: data.idx, isBaned: false, admin: client.isAdmin });
        }
    });

    socket.on('chat', function(data) {
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
        if( data.msg == "#1216" ) {
            client.isAdmin = !client.isAdmin;
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
        servman.io.sockets.emit('chat', {id: this.id, hash: ipHashed, nickname: data.nickname + '(' + ip + ')', msg: data.msg, mode: "chat", isBaned: isBaned, admin: client.isAdmin });
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
            servman.io.sockets.emit('chat', {id: this.id, hash: ipHashed, nickname: data.nickname + '(' + ip + ')', msg: '[검색] ' + data.msg, mode: "search", isBaned: isBaned, admin: client.isAdmin });
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
