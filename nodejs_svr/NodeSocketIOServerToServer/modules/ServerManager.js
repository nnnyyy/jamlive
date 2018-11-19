/**
 * Created by nnnyyy on 2018-08-20.
 */
'use strict'
const HashMap = require('hashmap');
const DistServer = require('./DistServer');
var dbhelper = require('../dbhelper');
const async = require('async');
const GlobalHintMan = require('./GlobalHintMan');
const OnePickManager = require('../server/modules/OnePickManager');
const Promise = require('promise');

const Redis = require('ioredis');

function pmPermanentBanByNick( sm, nick ) {
    return new Promise(function(resolve, reject) {
        dbhelper.updatePermanentBanByNick(nick, function(result) {
            resolve([sm, result]);
        });
    });
}

function pmAdminCmdLog(id, nick, act, contents) {
    return new Promise(function(resolve, reject) {
        dbhelper.addAdminCmdLog(id, nick, act, contents, function(result) {
            resolve(result);
        });
    });
}

class ServerManager {
    constructor(io, http) {
        const servman = this;

        this.io = io;
        this.http = http;
        this.redis = new Redis(6379, '127.0.0.1');
        this.opm = new OnePickManager(this);

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
        this.globalHintMan = new GlobalHintMan(this);

        async.waterfall(
            [
                async.apply(this.setServerInfo, this),
                this.setUpdate,
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

    setUpdate( servman, callback ) {
        setInterval(function() {
            servman.update();
        }, 200);

        callback( null, servman );
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

    update() {
        const tCur = new Date();

        this.opm.update( tCur );

        this.voteServMap.forEach(function(value, key){
            const distServ = value;
            distServ.update(tCur);
        })
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
                    this.join('auth');
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

    getVoteServerMap() {
        return this.voteServMap;
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

    getServType( idx ) {
        if( idx >=1 && idx <= 12 ) {
            return 'common';
        }
        else {
            return 'qfeat';
        }
    }

    getTotalVoteData( type ) {
        const sm = this;
        let voteTotal = [0,0,0,0];
        this.voteServMap.forEach(function(value, key){
            const servinfo = value;
            if( servinfo.usercnt >= 100
            && ( sm.getServType(servinfo.idx) == type )
            ) {
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

    broadcastMsg( adminid, adminUserInfo, msg ) {
        const sm = this;
        new Promise(function(resolve, reject) {

            sm.voteServMap.forEach(function(value, key){
                const distServer = value;
                distServer.sendMsg( msg );
            });

            resolve();

        }).then(function() {
                return pmAdminCmdLog(adminid,adminUserInfo.usernick,'메시지',`${msg}`);
            });
    }

    broadcastToAllVoteServer(protocol, packet) {
        this.voteServMap.forEach(function(value, key){
            const distServer = value;
            distServer.sendPacket(protocol, packet);
        });
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

    permanentBanByNick(adminid, adminUserInfo, nick, res) {
        pmPermanentBanByNick(this, nick)
        .then(function(o) {
                const sm = o[0];
                const result = o[1];

                if( result.ret == 0 )
                    sm.banReload();
                res.json(result);

                return pmAdminCmdLog(adminid,adminUserInfo.usernick,'닉 밴',`${nick}`);
        })
    }

    setServerLimit(adminid, adminUserInfo, name, limit, res) {
        const sm = this;
        new Promise(function(resolve, reject) {
            dbhelper.updateServerLimit(name, limit, function(result) {
                var serv = sm.servinfo.get(name);
                serv.limit = limit;
                let distServ = sm.chServMapByName.get(name);
                if( distServ ) {
                    distServ.userlimit = limit;
                }
                resolve(result);
            })
        })
        .then(function(result) {
                res.json(result);
                return pmAdminCmdLog(adminid,adminUserInfo.usernick,'서버 인원 설정',`name: ${name}, limit: ${limit}`);
        });

    }

    broadcastUpdateNotice( noticeData ) {
        this.voteServMap.forEach(function(value, key){
            const distServer = value;
            distServer.sendNoticeData( noticeData );
        })
    }

    isLiveQuizTime() {
        var cur = new Date();
        var hours = cur.getHours();
        return !( (hours >= 23 || hours < 12 ) || (hours >= 15 && hours < 18 ) );
    }

    FreezeChat( req, res ) {
        const adminId = req.session.username;
        const adnimNick = req.session.userinfo.usernick;
        const sm = this;

        new Promise(function(resolve, reject) {
            sm.broadcastToAllVoteServer('freeze', {} );

            resolve();
        })
        .then(function() {
                res.json({ret:0});
                return pmAdminCmdLog(adminId,adnimNick,'채팅창 얼리기',``);
            });
    }

    getAdminCmdLog(cb) {
        dbhelper.getAdminCmdLog(cb);
    }
}

module.exports = ServerManager;