/**
 * Created by nnnyy on 2018-10-13.
 */
'use strict'

const User = require('./User');
const ChatManager = require('./ChatManager');
const PT = require('../../src/common/protocols');

class ServerManager {
    constructor() {
        this.cm = new ChatManager(this);
    }

    init(ioServer) {
        this.initSocketIOListener(ioServer);
    }

    initSocketIOListener(ioServer) {
        const sm = this;
        ioServer.on('connection', socket => { sm.onConnection(socket); })
    }

    onConnection(socket) {
        this.setSocketListener(socket);
        //  Center Server에 갔다와야 한다
        if( User.isLogined(socket) ) {
            const userID = User.getIDFromSession(socket);
        }

        const newUser = new User(socket);
    }

    setSocketListener(socket) {
        const sm = this;
        socket.on(PT.SVR.CHAT, p => { sm.cm.onPacket(p) });
    }
}

module.exports = ServerManager;