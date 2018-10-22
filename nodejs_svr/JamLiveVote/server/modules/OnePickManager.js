/**
 * Created by nnnyy on 2018-10-21.
 */
'use strict'

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

class OnePickManager {
    constructor(sm) {
        this.servman = sm;
        this.init();
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
        this.broadcastStep();
    }

    broadcastStep() {
        const tCur = new Date();
        let packet = {
            step: this.step,
            elapsedTime: ( tCur - this.tStart )
        };

        switch(this.step) {
            case 0: {
                packet.tTotalWait = 5 * 1000;
                break;
            }

            case 1:{
                break;
            }
        }

        this.servman.io.sockets.in('auth').emit('one-pick', packet);
    }

    pick() {
        const len = this.challengers.length;
        this.atariIdx = getRandomInt(0, len-1);
        this.tStart = new Date();
        this.step++;
        this.broadcastStep();
    }

    update(tCur) {
        if( !this.isRunning ) return;

        if( this.step == 0 && tCur - this.tStart >= 5 * 1000 ) {
            this.pick();
        }
    }
}

module.exports = OnePickManager;