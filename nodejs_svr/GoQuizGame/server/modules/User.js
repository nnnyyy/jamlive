/**
 * Created by nnnyy on 2018-10-13.
 */
class User {
    constructor( socket ) {
        this.socket = socket;
        this.tDisconnected = 0;
    }

    disconnect() {
        this.tDisconnected = new Date();
    }

    static isLogined( socket ) {
        try {
            if( socket.handshake.session.authData ) {
                return true;
            }
            else {
                return false;
            }
        }catch(e) {
            return false;
        }
    }

    static getIDFromSession( socket ) {
        try {
            return socket.handshake.session.authData.id;
        }catch(e) {
            return null;
        }
    }
}

module.exports = User;