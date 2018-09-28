/**
 * Created by nnnyyy on 2018-08-20.
 */
'use strict'
const HashMap = require('hashmap');
const DistServer = require('./DistServer');
var dbhelper = require('../dbhelper');
const async = require('async');

const Redis = require('ioredis');

class ServerManager {
    constructor(io, http) {
        const servman = this;

        this.io = io;
        this.http = http;
        this.redis = new Redis(6379, '127.0.0.1');

        this.redis.get('global-notice', (err,info) => {
            try {
                if( !err ) {
                    const parsedInfo = JSON.parse(info);
                    if( parsedInfo ) {
                        servman.noticeData = parsedInfo.notice;
                        this.broadcastUpdateNotice(parsedInfo.notice);
                    }
                    else {
                        this.broadcastUpdateNotice('');
                    }
                }
                else {
                    console.log('global-notice load error!!');
                }
            }catch(e) {
                console.log(e);
            }
        });
        // Child Server Map
        this.chServMap = new HashMap();
        this.chServMapByName = new HashMap();
        this.voteServMap = new HashMap();
        this.servinfo = new HashMap();

        this.searchQueryMap = new HashMap();

        async.waterfall(
            [
                async.apply(this.setServerInfo, this),
                this.listen
            ]
            ,
            function(err){
                if( err == null ) {
                    console.log('ServerManager settings is completed');
                }
                else {
                    console.log('ServerManager settings is failed');
                }
        });
    }

    setServerInfo( servman, callback ) {
        dbhelper.getServerInfo(function(result) {
            if( result.ret != 0 ) {
                callback(-1);
                return;
            }

            console.log('--- server info loaded ---');

            for( var i = 0 ; i < result.info.length ; ++i ) {
                const item = result.info[i];
                servman.servinfo.set(item.name, {name: item.name, url: item.url, limit: item.limit, idx: item.idx });
            }

            callback( null, servman );
        });
    }

    listen( servman, callback ) {
        servman.io.on('connection', function(socket) {
            // Child Server Connected
            servman.addServer(socket);
        });

        servman.http.listen(7777, function() {
            console.log('listening on *:7777');
        });

        callback( null );
    }

    addServer( socket ) {
        const servman = this;
        console.log(`child server connected!`);
        servman.chServMap.set(socket.id, new DistServer(servman, socket) );

        socket.on('serv-info', function(packet) {
            try {
                let distServInfo = servman.chServMap.get(this.id);
                if( !distServInfo ) return;
                distServInfo.type = packet.type;
                console.log(`type - ${packet.type} : ${packet.name}`);
                const info = servman.servinfo.get(packet.name);

                servman.chServMapByName.set(packet.name, distServInfo );

                if( packet.type == 'vote-server' ) {
                    distServInfo.name = packet.name;
                    distServInfo.userlimit = info.limit;
                    distServInfo.url = info.url;
                    distServInfo.idx = info.idx;
                    servman.voteServMap.set(this.id, distServInfo);
                    distServInfo.sendNoticeData(servman.noticeData);
                    distServInfo.sendVoteData();
                }
                else if( packet.type == 'route-server') {

                }
                else if( packet.type == 'premium-server') {
                    distServInfo.name = packet.name;
                    distServInfo.setPremiumListener();
                }
                distServInfo.sendCount();
            }catch(e) {
                console.log(e);
            }
        })

        socket.on('disconnect', function() {
            try {
                servman.removeServer(this);
            }catch(e) {
                console.log(e);
            }
        })
    }

    getServer( socket ) {
        this.chServMap.get(socket.id);
    }

    removeServer( socket ) {
        let distServer = this.chServMap.get( socket.id );
        console.log(`child server disconnected - ${distServer.name}`);
        this.chServMap.delete(socket.id);
        this.chServMapByName.delete(distServer.name );
        if( distServer.type == 'vote-server' ) {
            this.voteServMap.delete( socket.id );
        }
        else if ( distServer.type == 'route-server' ) {

        }
        distServer.clear();
    }

    getVoteServerCntInfo() {
        let data = [];
        this.voteServMap.forEach(function(value, key){
            const servinfo = value;
            data.push({name: servinfo.name, cnt: servinfo.usercnt, limit: servinfo.userlimit, url: servinfo.url });
        })

        return data;
    }

    getTotalUserCnt() {
        let totalCnt = 0;
        this.voteServMap.forEach(function(value, key){
            const servinfo = value;
            totalCnt += servinfo.usercnt;
        })

        return totalCnt;
    }

    getVoteServerVoteData() {
        let data = [];
        this.voteServMap.forEach(function(value, key){
            const servinfo = value;
            data.push({name: servinfo.name, cnt: servinfo.usercnt, votedata: servinfo.voteCnts, idx: servinfo.idx });
        })

        return data;
    }

    getTotalVoteData() {
        let voteTotal = [0,0,0,0];
        this.voteServMap.forEach(function(value, key){
            const servinfo = value;
            if( servinfo.usercnt >= 120 ) {
                voteTotal[0] += servinfo.voteCnts[0];
                voteTotal[1] += servinfo.voteCnts[1];
                voteTotal[2] += servinfo.voteCnts[2];
                voteTotal[3] += servinfo.voteCnts[3];
            }
        })

        return voteTotal;
    }

    getSearchQueries() {
        const servman = this;
        var tCur = new Date();
        this.searchQueryMap.forEach(function(value, key) {
            if( tCur - value.tLast > 12 * 1000 ) {
                servman.searchQueryMap.delete(key);
            }
        })

        var searchlist = this.searchQueryMap.values();
        searchlist.sort(function(item1, item2) {
            return item2.cnt - item1.cnt;
        });
        searchlist = searchlist.slice(0, 7);

        return searchlist;
    }

    broadcastMsg( msg ) {
        this.voteServMap.forEach(function(value, key){
            const distServer = value;
            distServer.sendMsg( msg );
        })
    }

    reloadServInfo() {
        const servman = this;
        dbhelper.getServerInfo(function(result) {
            if( result.ret != 0 ) {
                return;
            }

            console.log('--- server info reloaded ---');

            for( var i = 0 ; i < result.info.length ; ++i ) {
                const item = result.info[i];
                servman.servinfo.set(item.name, {name: item.name, url: item.url, limit: item.limit });
                let distServ = servman.chServMapByName.get(item.name);
                if( distServ ) {
                    distServ.url = item.url;
                    distServ.userlimit = item.limit;
                }
            }
        });
    }

    addSearchQuery(query, isCounting) {
        if( !this.searchQueryMap.get( query ) ) {
            this.searchQueryMap.set( query, { query: query, cnt: 1, tLast: new Date() });
        }
        else {
            var d = this.searchQueryMap.get( query );
            if( isCounting )
                d.cnt += 1;
            d.tLast = new Date();
        }
    }

    banReload() {
        try {
            console.log('-- ban Reload --');
            this.voteServMap.forEach(function(value, key){
                const distServer = value;
                if( distServer && distServer.socket ) {
                    distServer.socket.emit('ban-reload', {});
                }
            })
        }catch(e) {
            console.log(e);
        }
    }

    permanentBanByNick(nick, res) {
        const servman = this;
        dbhelper.updatePermanentBanByNick(nick, function(result) {
            if( result.ret == 0 )
                servman.banReload();

            res.json(result);
        });
    }

    permanentBanByIp(ip, res) {
        const servman = this;
        dbhelper.updatePermanentBanByIp(ip, function(result) {
            if( result.ret == 0 )
                servman.banReload();

            res.json(result);
        });
    }

    broadcastUpdateNotice( noticeData ) {
        this.voteServMap.forEach(function(value, key){
            const distServer = value;
            distServer.sendNoticeData( noticeData );
        })
    }
}

module.exports = ServerManager;