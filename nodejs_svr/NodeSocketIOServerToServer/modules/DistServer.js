/**
 * Created by nnnyyy on 2018-08-20.
 */
'use strict'
const Client = require('./Client');
const HashMap = require('hashmap');

class DistServer {
    constructor(servman, socket) {
        this.servman = servman;
        this.socket = socket;
        this.type;
        this.usercnt = 0;

        const distServ = this;

        socket.on('user-cnt', function(packet) {
            try {
                distServ.usercnt = packet.cnt;
            }catch(e) {
                console.log(e);
            }
        })
    }

    sendCount() {
        const server = this;
        this.sendCountIntervalId = setInterval( function() {
            var info = server.servman.getVoteServerCntInfo();
            server.socket.emit('user-cnt', {data: info });
        }, 1000);
    }
}


module.exports = DistServer;
