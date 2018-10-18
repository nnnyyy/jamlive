/**
 * Created by nnnyy on 2018-10-13.
 */
'use strict'

const User = require('./User');
const ChatManager = require('./ChatManager');
const PT = require('../../src/common/protocols');
const DBHelper = require('../DBHelpers');

class ServerManager {
    constructor() {
        this.cm = new ChatManager(this);
        this.users = new Map();
    }

    init(ioServer) {
        const sm = this;
        this.initSocketIOListener(ioServer);
        setInterval(function() { sm.update(new Date()) }, 500);
    }

    update(tCur) {
        const _users = this.users;
        this.users.forEach(function(user, key) {
            if( !user.socket.connected && ( tCur - user.tDisconnected >= 10 * 1000 ) ) {
                _users.delete(key);
                console.log(`user lazy disconnected - ${key}`);
            }
        });
    }

    initSocketIOListener(ioServer) {
        const sm = this;
        ioServer.on('connection', socket => { sm.onConnection(socket); })
    }

    //  유저가 socket.io 접속을 시도
    onConnection(socket) {
        this.setSocketListener(socket);
    }

    onDisconnect(socket) {
        const sm = this;
        if( User.isLogined( socket ) ) {
            const id = User.getIDFromSession( socket );
            const user = this.users.get(id);
            if(user) user.disconnect();
        }
    }

    setSocketListener(socket) {
        const sm = this;
        if( socket.handshake.session.authData ) {
            const user = sm.users.get( socket.handshake.session.authData.id );
            if( user ) {
                user.socket = socket;
                console.log(`re login! - ${socket.handshake.session.authData.id}`);
                socket.emit(PT.LOGIN, {ret : 0} );
            }
        }

        socket.on(PT.SVR.CHAT, p => { sm.cm.onPacket(p) });
        socket.on(PT.LOGIN, p=> { sm.onLogin(socket, p) });
        socket.on('disconnect', ()=> { sm.onDisconnect(socket) })
    }

    onLogin(socket, packet) {
        const sm = this;
        DBHelper.login(packet.id, packet.pw, '', function(ret) {
            console.log(ret);
            if( ret.ret == 0 ) {
                const newUser = new User(socket);
                sm.users.set(packet.id, newUser);
                 socket.handshake.session.authData = { id: ret.id };
                socket.handshake.session.save();
            }
            socket.emit(PT.LOGIN, {ret : ret.ret} );
        })
    }
}

module.exports = ServerManager;