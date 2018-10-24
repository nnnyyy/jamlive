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
        this.servman.center.socket.emit('one-pick-game', {subType: 'start'});
        /*
        if( this.isRunning ) return;
        this.isRunning = true;
        this.step = 0;
        this.tStart = new Date();
        this.broadcastStep();
        */
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

                //  참여자 수 보여주기
            case 1:{
                packet.cnt = this.challengers.length;
                break;
            }

                //  돌리기
            case 2:{
                packet.list = this.challengers;
                packet.atari = this.atariIdx;
                break;
            }
        }

        this.servman.io.sockets.in('auth').emit('one-pick', packet);
    }

    pick() {
        const len = this.challengers.length;
        if( len <= 0 ) {
            this.end();
            return;
        }
        this.atariIdx = getRandomInt(0, len-1);
        this.tStart = new Date();
        this.step = 1;
        this.broadcastStep();
    }

    slotStart() {
        this.tStart = new Date();
        this.step = 2;
        this.broadcastStep();
    }

    end() {
        try {
            this.servman.chatMan.BroadcastAdminMsg(this.servman.io, `${this.challengers[this.atariIdx].nick}님 당첨 축하합니다~!`);
            this.isRunning = false;
            this.tStart = new Date();
            this.step = 3;
            this.broadcastStep();
            this.init();
        }catch(e) {
            this.init();
        }
    }

    update(tCur) {
        if( !this.isRunning ) return;

        if( this.step == 0 && tCur - this.tStart >= 20 * 1000 ) {
            this.pick();
        }

        if( this.step == 1 && tCur - this.tStart >= 4 * 1000 ) {
            this.slotStart();
        }

        if( this.step == 2 && tCur - this.tStart >= 16 * 1000 ) {
            this.end();
        }
    }

    onPacket(client, packet) {
        try {
            if( !client ) return;
            this.servman.center.socket.emit('one-pick-game', {subType: 'addUser', nick: client.nick });
        }catch(e) {
            console.log(e);
        }
    }

    onPacketCenter( packet ) {
        this.servman.io.sockets.in('auth').emit('one-pick', packet);
    }
}

module.exports = OnePickManager;