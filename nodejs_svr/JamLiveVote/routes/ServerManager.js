/**
 * Created by nnnyy on 2018-05-10.
 */
var HashMap = require('hashmap');
var Client = require('./client');
var ChatRoom = require('./chatroom');
var ServerMan = function() {
    this.socketmap = new HashMap();
    this.uniqueip = new HashMap();
    this.counts = new HashMap();
    this.countslist = [];
}

var servman = new ServerMan();

ServerMan.prototype.addSocket = function(socket) {
    this.socketmap.set(socket, new Client(socket));
    this.uniqueip.set(socket.handshake.address, 1);
    console.log('user connected : ' + socket.handshake.address);
}

ServerMan.prototype.removeSocket = function(socket) {
    if( this.socketmap.get(socket) == null ) {
        console.log('Error');
        return;
    }

    this.socketmap.delete(socket);
    this.uniqueip.delete(socket.handshake.address);
    console.log('user disconnected : ' + socket.handshake.address);
}

ServerMan.prototype.getClient = function(socket){
    return this.socketmap.get(socket);
}

ServerMan.prototype.setIO = function(io) {
    this.io = io;
    this.chatroom = new ChatRoom(io);

    setInterval(function() {
        servman.broadcastVoteInfo();
    }, 500);
}

ServerMan.prototype.broadcastVoteInfo = function() {
    var cur = new Date();
    cur -= cur % 500;
    cur /= 500;

    if( this.counts.get(cur) == null ) {
        this.counts.set(cur, [0,0,0]);
        this.countslist.push(cur);
        if( this.counts.count() > 10 ) {
            this.counts.delete(this.countslist[0]);
            this.countslist.shift();
        }
    }

    this.io.sockets.emit('testdata', {cnt: JSON.stringify(this.counts), users: this.socketmap.count()})
}

ServerMan.prototype.click = function(idx) {
    var cur = new Date();
    cur -= cur % 500;
    cur /= 500;

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

ServerMan.prototype.register = function(socket) {
    this.addSocket(socket);
    socket.on('disconnect', function(){
        servman.chatroom.leave(this);
        servman.removeSocket(this);
    });

    socket.on('vote', function(data) {
        var client = servman.getClient(this);
        var ip = this.handshake.address.substr(7);
        ip = ip.substr(0, ip.lastIndexOf('.') + 1) + 'xx';
        if( client.isClickable() ) {
            servman.click(data.idx);
            client.tLastClick = new Date();

            var number = Number(data.idx) + 1;

            servman.io.sockets.emit('chat', {nickname: data.nickname + '(' + ip + ')', msg: '[투표] ' + number, isvote: data.idx });
        }
    });

    socket.on('chat', function(data) {
        var ip = this.handshake.address.substr(7);
        ip = ip.substr(0, ip.lastIndexOf('.') + 1) + 'xx';
        servman.io.sockets.emit('chat', {nickname: data.nickname + '(' + ip + ')', msg: data.msg, isvote: data.isvote });
    })

    socket.on('enterchat', function(data) {
        servman.chatroom.enter(this, data.nickname);
    });

    socket.on('leavechat', function() {
        servman.chatroom.leave(this);
    });
}

module.exports = servman;
