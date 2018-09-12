/**
 * Created by nnnyyy on 2018-09-12.
 */
'use strict'

class ClientSocket {
    constructor(socket) {
        this.socket = socket;
        this.setListener();
        this.pw = '';
        this.auth = false;
    }

    setListener() {
        let clientSock = this;
        this.socket.on('pw', function(packet) {
            if( clientSock.auth ) return;
            clientSock.pw += packet.key;

            if( clientSock.pw == 'APDLVMF' ) {
                clientSock.socket.join('auth-user');
                clientSock.auth = true;
            }
        })
    }
}

module.exports = ClientSocket;