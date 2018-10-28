/**
 * Created by nnnyyy on 10/28/2018.
 */

'use strict';

class User {
    constructor(socket) {
        this.socket = socket;
        this.userinfo = socket.handshake.session.userinfo;
    }

    static isLoginUser(socket) {
        return socket.handshake.session.username != null;
    }
}

module.exports = User;