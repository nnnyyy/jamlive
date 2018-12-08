/**
 * Created by nnnyyy on 10/28/2018.
 */
'use strict';
const Center = require('./Center');
const WebSearchEngine = require('./WebSearchManager');
const User = require('./User');
const HashMap = require('hashmap');

class ServerManager {
    constructor() {
        this.users = new HashMap();
    }

    init(io) {
        this.io = io;
        this.center = new Center(this);
        this.searchEngine = new WebSearchEngine(this);
        this.initIOListener();
    }

    initIOListener() {
        const sm = this;
        this.io.on('connection', function(socket) {
            try {
                if( !User.isLoginUser(socket) ) {
                    socket.disconnect();
                    return;
                }

                const newUser = new User(socket);
                sm.users.set(newUser.userinfo.nick, newUser);
                socket.on('search', function(packet){ sm.searchEngine.onSearch(newUser, packet) });
                socket.on('disconnect', function(){ sm.onDisconnect(newUser.userinfo.nick); })
            }catch(e) {
                console.log(e);
            }
        });
    }

    onDisconnect(nick) {
        this.users.delete(nick);
    }
};

let servman = new ServerManager();
module.exports = servman;