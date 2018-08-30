/**
 * Created by nnnyyy on 2018-08-20.
 */
'use strict'
const HashMap = require('hashmap');
const DistServer = require('./DistServer');
var dbhelper = require('../dbhelper');
const async = require('async');

const Redis = require('ioredis');
const redis = new Redis(6379, '127.0.0.1');

class ServerManager {
    constructor(io, http) {
        const servman = this;

        this.io = io;
        this.http = http;
        // Child Server Map
        this.chServMap = new HashMap();
        this.chServMapByName = new HashMap();
        this.voteServMap = new HashMap();
        this.servinfo = new HashMap();

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
                servman.servinfo.set(item.name, {name: item.name, url: item.url, limit: item.limit });
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
                    servman.voteServMap.set(this.id, distServInfo);
                }
                else if( packet.type == 'route-server') {

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
        clearInterval(distServer.sendCountIntervalId);
    }

    getVoteServerCntInfo() {
        let data = [];
        this.voteServMap.forEach(function(value, key){
            const servinfo = value;
            data.push({name: servinfo.name, cnt: servinfo.usercnt, limit: servinfo.userlimit, url: servinfo.url });
        })

        return data;
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
}

module.exports = ServerManager;