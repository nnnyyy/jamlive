/**
 * Created by nnnyyy on 2018-09-28.
 */
'use strict'

var HashMap = require('hashmap');

class searchManager {
    constructor() {
        this.recentSearch = [];
    }

    search(client, query) {
        try {
            if( !client ) return;

            const item = {clientid: client.socket.id, id: client.getUserId(), nick: client.nick, query: query, time: new Date() };
            if( this.recentSearch.length >= 100 ) {
                this.recentSearch.shift();
            }
            this.recentSearch.push(item);
        }
        catch(e) {
            console.log(e);
        }
    }

    getSearchList() {
        return this.recentSearch;
    }
}

module.exports = searchManager;