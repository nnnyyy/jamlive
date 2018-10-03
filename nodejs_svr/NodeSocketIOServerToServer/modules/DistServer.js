/**
 * Created by nnnyyy on 2018-08-20.
 */
'use strict'
const Client = require('./Client');
const HashMap = require('hashmap');

class DistServer {
    constructor(servman, socket) {
        this.servman = servman;
        this.globalHintMan = servman.globalHintMan;
        this.socket = socket;
        this.type;
        this.usercnt = 0;
        this.userlimit = 0;
        this.voteCnts = [0,0,0,0];
        this.url = '';
        this.idx = 0;

        const distServ = this;

        socket.on('user-cnt', function(packet) {
            try {
                distServ.usercnt = packet.cnt;
                distServ.voteCnts = packet.voteCnts;
            }catch(e) {
                console.log(e);
            }
        });

        socket.on('server-info-reload', function(packet) {
            try {
                distServ.servman.reloadServInfo();
            }catch(e) {
                console.log(e);
            }
        });

        socket.on('ban-reload', function(packet) {
            try {
                distServ.servman.banReload();
            }catch(e) {
                console.log(e);
            }
        })

        socket.on('search-query', function(packet) {
            try {
                distServ.servman.addSearchQuery(packet.query, packet.isCounting);
            }catch(e) {
                console.log(e);
            }
        })

        socket.on('global-hint' , function( packet ) {
            try {
                distServ.globalHintMan.onPacket( distServ, packet );
            }
            catch(e) {
                console.log(e);
            }
        })

        socket.on('disconnect-user', function( packet ) {
            try {
                distServ.globalHintMan.checkCancel('', packet.nick);
            }
            catch(e) {
                console.log(e);
            }
        })

        this.globalHintMan.sendInitPacket(this);
    }

    sendCount() {
        const server = this;
        this.sendCountIntervalId = setInterval( function() {
            var info = server.servman.getVoteServerCntInfo();
            server.socket.emit('user-cnt', {data: info });
        }, 1000);
    }

    sendMsg( msg ) {
        this.socket.emit('admin-msg', {msg : msg });
    }

    sendNoticeData( noticeData ) {
        this.socket.emit('notice-data', {noticeData: noticeData });
    }

    sendVoteData() {
        const server = this;
        this.sendVoteDataIntervalId = setInterval( function() {
            var totalVote = server.servman.getTotalVoteData();
            var totalCnt = server.servman.getTotalUserCnt();
            var searchQueryList = server.servman.getSearchQueries();
            server.socket.emit('total-vote', {totalCnt: totalCnt, totalVote: totalVote, searchQueries: searchQueryList });
        }, 300);
    }

    sendPacket( protocol, oPacket ) {
        this.socket.emit( protocol, oPacket );
    }

    setPremiumListener() {
        const server = this;
        this.sendPremiumIntervalId = setInterval( function() {
            var info = server.servman.getVoteServerVoteData();
            server.socket.emit('votedata', {data: info });
        }, 200);
    }

    clear() {
        clearInterval(this.sendCountIntervalId);
        clearInterval(this.sendPremiumIntervalId);
        clearInterval(this.sendVoteDataIntervalId);
    }
}


module.exports = DistServer;
