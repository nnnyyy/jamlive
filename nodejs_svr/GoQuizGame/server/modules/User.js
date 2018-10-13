/**
 * Created by nnnyy on 2018-10-13.
 */
class User {
    constructor( socket ) {
    }

    static isLogined( socket ) {
        try {
            if( socket.handshake.session.username ) {
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
            return socket.handshake.session.username;
        }catch(e) {
            return null;
        }
    }
}

module.exports = User;