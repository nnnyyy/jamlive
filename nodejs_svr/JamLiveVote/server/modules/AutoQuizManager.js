/**
 * Created by nnnyyy on 2018-10-18.
 */
'use strict'

const async = require('async');
const DB = require('../../routes/dbhelper');

class QuizObject {

}

//  자동 퀴즈 매니져 클래스
class AutoQuizManager {
    constructor(servman) {
        this.servman = servman;
        this.isRunning = false;
        this.tQuizStart = 0;
        this.tQuizEnd = 0;
        this.mVoteClient = new Map();
        this.bForcedStop = false;
    }

    makeQuiz( providerNick, callback ) {
        async.waterfall(
            [
                async.apply(this.getRandomQuiz, this, providerNick),
                this.sendQuizToClients
            ]
            ,
            function(err){
                if( err == null ) {
                    callback();
                }
                else {
                    console.log(`make Quiz Failed - ${err}`);
                    callback();
                }
            });
    }

    getRandomQuiz(aqm, providerNick, callback) {
        DB.getRandomQuiz(function(result) {
            if( result.ret != 0 ) {
                callback(-1);
                return;
            }

            aqm.setQuiz(result.quizdata, providerNick);
            callback(null, aqm);
        })
    }

    sendQuizToClients(aqm, callback) {
        try {
            aqm.servman.io.sockets.emit('quiz', {quizdata: aqm.curQuizData, nick: aqm.lastProviderNick});
            callback(null);
        }
        catch(e) {
            console.log(e);
            callback(-1);
        }
    }

    setQuiz(quizdata, providerNick) {
        this.curQuizData = quizdata;
        this.lastProviderNick = providerNick;
        this.isRunning = true;
        this.tQuizStart = new Date();
        this.tQuizEnd = 0;
        this.mVoteClient = new Map();
    }

    update(tCur) {
        const aqm = this;
        if( this.isRunning &&  this.tQuizStart != 0 && tCur - this.tQuizStart >= 11 * 1000 ) {
            this.tQuizEnd = tCur;
            this.tQuizStart = 0;

            let collectCnt = 0;
            let totalCnt = this.mVoteClient.size;

            this.mVoteClient.forEach(function(idx, key) {
                if( aqm.curQuizData.collect == idx ) {
                    collectCnt++;
                }
            });

            this.servman.io.sockets.emit('quizret', {collect_cnt: collectCnt, total_cnt: totalCnt, collect_idx: this.curQuizData.collect });
        }

        if( this.isRunning && this.tQuizEnd != 0 && tCur - this.tQuizEnd >= 7 * 1000 ) {
            this.isRunning = false;
            this.tQuizStart = 0;
            this.tQuizEnd = 0;
        }
    }

    canMakeQuiz() {
        return !this.bForcedStop && !this.isRunning;
    }

    isVote() {
        return this.isRunning && this.tQuizStart != 0;
    }

    setForcedStop(bForced) {
        this.bForcedStop = bForced;
    }

    vote( client, idx ) {
        try {
            if( !client ) {
                return;
            }

            this.mVoteClient.set(client.nick, idx);

        }catch(e) {
            console.log(e);
        }
    }
}


module.exports = AutoQuizManager;
