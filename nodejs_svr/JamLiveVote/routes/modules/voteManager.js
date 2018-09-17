/**
 * Created by nnnyy on 2018-09-17.
 */
'use strict'

var HashMap = require('hashmap');

class voteManager {
    constructor() {
        this.recentVote = [];
    }

    vote(client, idx) {
        try {
            if( !client ) return;

            const item = {clientid: client.socket.id, id: client.getUserId(), nick: client.nick, voteIdx: idx, time: new Date() };
            if( this.recentVote.length >= 40 ) {
                this.recentVote.shift();
            }
            this.recentVote.push(item);
        }
        catch(e) {
            console.log(e);
        }
    }

    getVoteList() {
        return this.recentVote;
    }
}

module.exports = voteManager;