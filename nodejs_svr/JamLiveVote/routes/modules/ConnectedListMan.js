/**
 * Created by nnnyyy on 8/5/2018.
 */
'use strict'

var HashMap = require('hashmap');
var Client = require('../client');

class CConnectedlistMan {
    constructor(){
        this.mList = new HashMap();
    }

    addUser(client) {
        try {
            this.mList.set(client.nick, client);
            if( client ) {
                client.socket.broadcast.emit('update-user', {op: 'add', nick: client.nick });
            }
        }catch(e){
            console.log(`connlistman - addUser Error : ${e}`);
        }
    }

    removeUser(client) {
        try {
            this.mList.delete(client.nick);
            if( client ) {
                client.socket.broadcast.emit('update-user', {op: 'remove', nick: client.nick });
            }
        }catch(e) {
            console.log(`connlistman - removeUser Error : ${e}`);
        }
    }

    updateListToClient(client) {
        try {
            if( client ) {
                client.socket.emit('update-users', {list: this.getUserNickList()})
            }
        }catch(e) {
            console.log(`connlistman - updateListToClient Error : ${e}`);
        }
    }

    getUserNickList() {
        return this.mList.keys();
    }

    getUser(nick) {
        try {
            return this.mList.get( nick );
        }catch( e ) {
            return null;
        }
    }
}


module.exports = CConnectedlistMan;