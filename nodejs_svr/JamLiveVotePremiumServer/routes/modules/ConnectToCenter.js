/**
 * Created by nnnyyy on 2018-09-12.
 */
'use strict'

const ioclient = require('socket.io-client');

class ConnectToCenter {
    constructor(io) {
        this.socketToCenter = ioclient.connect('http://localhost:7777', {reconnect: true });
        this.ioToClient = io;
        this.setListener();
    }

    setListener() {
        const ctc = this;
        this.socketToCenter.on('connect', function () {
            this.emit('serv-info', { type: "premium-server", name: 'Premium1' });
            this.on('disconnect', function() {
                this.off('votedata');
                console.log('disconnect from center');
            });

            this.on('votedata', function(packet) {
                try {
                    ctc.ioToClient.sockets.in('auth-user').emit('votedata', packet);
                }
                catch(e) {
                    console.log(e);
                }
            });
        });
    }
}

module.exports = ConnectToCenter;