/**
 * Created by nnnyy on 2018-05-10.
 */
var HashMap = require('hashmap');
var Client = require('./client');
var ServerMan = function() {
    this.socketmap = new HashMap();
    this.counts = new HashMap();
    this.countslist = [];
}

var servman = new ServerMan();

ServerMan.prototype.addSocket = function(socket) {
    this.socketmap.set(socket, new Client(socket));
    console.log('user connected : ' + socket.handshake.address);
}

ServerMan.prototype.removeSocket = function(socket) {
    if( this.socketmap.get(socket) == null ) {
        console.log('Error');
        return;
    }

    this.socketmap.delete(socket);
    console.log('user disconnected : ' + socket.handshake.address);
}

ServerMan.prototype.getClient = function(socket){
    return this.socketmap.get(socket);
}

ServerMan.prototype.setIO = function(io) {
    this.io = io;

    setInterval(function() {
        servman.broadcastVoteInfo();
    }, 700);
}

ServerMan.prototype.broadcastVoteInfo = function() {
    var cur = new Date();
    cur /= 1000;
    cur -= (cur % 3);

    if( this.counts.get(cur) == null ) {
        this.counts.set(cur, [0,0,0]);
        this.countslist.push(cur);
        if( this.counts.count() > 10 ) {
            this.counts.delete(this.countslist[0]);
            this.countslist.shift();
        }
    }

    //console.log(this.counts);

    this.io.sockets.emit('testdata', {cnt: JSON.stringify(this.counts)})
}

ServerMan.prototype.click = function(idx) {
    var cur = new Date();
    cur /= 1000;
    cur -= (cur % 3);
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
        servman.removeSocket(this);
    });

    socket.on('vote', function(data) {
        var client = servman.getClient(this)
        if( client.isClickable() ) {
            servman.click(data.idx);
            client.tLastClick = new Date();
        }
    })
}

module.exports = servman;
