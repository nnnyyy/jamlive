/**
 * Created by nnnyyy on 10/28/2018.
 */

'use strict';

class User {
    constructor(socket) {
        this.socket = socket;
        this.userinfo = socket.handshake.session.userdata;
    }

    static isLoginUser(socket) {
        return socket.handshake.session.userdata != null;
    }
}

module.exports = User;