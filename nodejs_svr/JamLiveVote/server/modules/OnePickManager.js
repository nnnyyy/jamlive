/**
 * Created by nnnyy on 2018-10-21.
 */
'use strict'

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

class OnePickManager {
    constructor() {
        init();
    }

    init() {
        this.challengers = [];
        this.isRunning = false;
        this.step = 0;
        this.atariIdx = -1;
        this.tStart = 0;
    }

    add( challengerID, challengerNick ) {
        const newChallenger = { nick: challengerNick }
        this.challengers.push( newChallenger );
    }

    challenge() {
        if( this.isRunning ) return;
        this.isRunning = true;
        this.step = 0;
        this.tStart = new Date();
    }

    pick() {
        const len = this.challengers.length;
        this.atariIdx = getRandomInt(0, len-1);
        this.tStart = new Date();
        this.step++;
    }

    update(tCur) {
        if( !this.isRunning ) return;

        if( this.step == 0 && tCur - this.tStart >= 60 * 1000 ) {
            this.pick();
        }
    }
}