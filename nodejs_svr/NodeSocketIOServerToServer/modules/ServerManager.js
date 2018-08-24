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
                console.log(`type - ${packet.type}`);
                if( packet.type == 'vote-server' ) {
                    distServInfo.name = packet.name;
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
            data.push({name: servinfo.name, cnt: servinfo.usercnt});
        })

        return data;
    }
}

module.exports = ServerManager;