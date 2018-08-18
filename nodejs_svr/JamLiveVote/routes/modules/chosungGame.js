/**
 * Created by nnnyyy on 2018-08-17.
 */
'use strict'

var Hangul = require('hangul-js');
var async = require('async');
var request = require('request');
var cheerio = require('cheerio');
var dbhelper = require('../dbhelper');
var Log = require('../Log');
var jaum = ['ㄱ', 'ㄴ', 'ㄷ','ㄹ','ㅁ','ㅂ','ㅅ','ㅇ','ㅈ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];

class ChosungGame {
    constructor(io) {
        this.bRunning = false;
        this.io = io;
        this.step = 0;
        this.tStart = 0;
        this.quizCnt = 0;
    }

    start() {
        this.bRunning = true;
        this.quizCnt = 0;

        async.waterfall(
            [
                async.apply(this.getRandWords, this),
                this.broadcastStartQuiz
            ]
            ,
            function(err){
                if( err == null ) {

                }
                else {
                    this.bRunning = false;
                    Log.logger.debug('DB Failed - login');
                }
            });
    }

    getRandWords(man, callback) {
        dbhelper.getRandomWords(function(data) {
            if( data.ret != 0 ) {
                callback(data.ret);
                return;
            }

            callback(null, data.words, man);
        })
    }

    broadcastStartQuiz(man, words, callback) {
        man.io.sockets.emit('chosung', {step: 'start'});
        man.step = 0;
        man.tStart = new Date();
        callback( null );
    }

    isRunning() {
        return this.bRunning;
    }

    stop() {
        this.bRunning = false;
        this.io.sockets.emit('chosung', {step: 'stop'});
    }

    update( tCur ) {
        if( !this.isRunning() ) return;
    }
}


module.exports = ChosungGame;
