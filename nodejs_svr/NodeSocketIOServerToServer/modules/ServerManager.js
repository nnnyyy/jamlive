/**
 * Created by nnnyyy on 2018-08-20.
 */
'use strict'
const HashMap = require('hashmap');
const DistServer = require('./DistServer');

const Redis = require('ioredis');
const redis = new Redis(6379, '127.0.0.1');

class ServerManager {
    constructor(io) {
        const servman = this;

        this.io = io;
        // Child Server Map
        this.chServMap = new HashMap();
        this.voteServMap = new HashMap();
        this.servinfo = new HashMap();
        this.servinfo.set('서버1', {name: '서버1', url: 'http://databucket.duckdns.org:4650/', limit: 1400 });
        this.servinfo.set('서버2', {name: '서버2', url: 'http://databucket.duckdns.org:5647/', limit: 1400 });
        this.servinfo.set('서버3', {name: '서버3', url: 'http://databucket.duckdns.org:6647/', limit: 1400 });
        this.servinfo.set('서버4', {name: '서버4', url: 'http://databucket.duckdns.org:7647/', limit: 1400 });
        this.servinfo.set('서버5', {name: '서버5', url: 'http://databucket.duckdns.org:8647/', limit: 1400 });

        io.on('connection', function(socket) {
            // Child Server Connected
            servman.addServer(socket);
        });
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
                console.log('server disconnected');
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
        console.log(`child server disconnected - `);
        this.chServMap.delete(socket.id);
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
}

module.exports = ServerManager;