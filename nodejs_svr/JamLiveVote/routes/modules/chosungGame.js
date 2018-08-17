/**
 * Created by nnnyyy on 2018-08-17.
 */
'use strict'

var Hangul = require('hangul-js');
var async = require('async');

class ChosungGame {
    constructor(io, chatman) {
        this.bRunning = false;
        this.io = io;
        this.chatman = chatman;
    }

    start() {
        this.bRunning = true;
        //this.chatman.BroadcastByServ(this.io, )
    }

    isRunning() {
        return this.bRunning;
    }

    update() {
        if( !this.isRunning() ) return;
    }
}


module.exports = ChosungGame;
