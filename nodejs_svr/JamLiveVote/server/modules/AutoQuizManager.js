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
                    console.log('make Quiz Success');
                    callback();
                }
                else {
                    console.log('make Quiz Failed');
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
    }

    update(tCur) {
        if( this.isRunning && tCur - this.tQuizStart >= 11 * 1000 ) {
            this.isRunning = false;
            this.servman.io.sockets.emit('quizret', {collect_cnt: 0, total_cnt: 0, collect_idx: this.curQuizData.collect });
        }
    }
}


module.exports = AutoQuizManager;
