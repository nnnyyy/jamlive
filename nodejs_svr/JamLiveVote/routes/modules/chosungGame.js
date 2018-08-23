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
        this.quizIdx = 0;
        this.words = [];
    }

    start() {
        if( this.isRunning() ) {
            console.log('already start');
            return;
        }
        this.bRunning = true;
        this.quizIdx = 0;

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

    broadcastStartQuiz(words, man, callback) {
        man.io.sockets.emit('chosung', {step: 'start'});
        man.step = 1;
        man.words = words;
        man.quizIdx = 0;
        man.tStart = new Date();
        callback( null );
    }

    broadcastQuestion(prev) {
        const word = this.words[ this.quizIdx ];
        this.currentWord = [];
        for( var i = 0 ; i < word.length ; ++i ) {
            this.currentWord[i] = word.substring(i, i+1);
        }
        this.question = [];
        const a = Hangul.d(word, true);
        var chosung = '';
        for( var i = 0 ; i < a.length ; ++i) {
            chosung += a[i][0];
            this.question[i] = a[i][0];
        }

        //console.log(`quiz : ${word} -> ${chosung}`);

        this.io.sockets.emit('chosung', {step: 'q', q: chosung, prev_q: prev});
        this.tStartQuestion = new Date();
        this.tLastHint = new Date();
        this.nHintCnt = 0;
    }

    showHint() {
        if( this.question.length <= this.nHintCnt + 1 ) return;

        this.question[this.nHintCnt] = this.currentWord[this.nHintCnt];

        var chosung = '';
        for( var i = 0 ; i < this.question.length ; ++i) {
            chosung += this.question[i];
        }

        this.io.sockets.emit('chosung', {step: 'q-hint', q: chosung});
        this.nHintCnt++;
        this.tLastHint = new Date();
    }

    broadcastNextWord() {
        var prev = this.words[this.quizIdx];
        this.quizIdx++;
        if( this.words.length <= this.quizIdx ) {
            // 게임 종료 후 결과 제공
            this.bRunning = false;
            this.broadcastResult();
            return;
        }

        this.broadcastQuestion(prev);
    }

    broadcastFail() {
        this.io.sockets.emit('chosung', {step: 'fail', q: this.question});
    }

    broadcastResult() {
        this.io.sockets.emit('chosung', {step: 'result'});
    }

    broadcastMessage( msg ) {
        this.io.sockets.emit('chosung', {step: 'msg', msg: msg });
    }

    isRunning() {
        return this.bRunning;
    }

    sendState(socket) {
        socket.emit('chosung', {step: 'wait'});
    }

    stop() {
        if( !this.bRunning ) return;

        this.bRunning = false;
        this.io.sockets.emit('chosung', {step: 'stop'});
    }

    update( tCur ) {
        if( !this.isRunning() ) return;

        if( this.step == 1 && tCur - this.tStart >= 5000 ) {
            this.step = 2;
            this.broadcastQuestion();
        }

        if( this.step == 2 && tCur - this.tLastHint >= 1000 * 20 ) {
            this.showHint();
        }

        if( this.step == 2 && tCur - this.tStartQuestion >= 1000 * 60 ) {
            this.broadcastFail();
            this.broadcastNextWord();
        }
    }

    checkAnswer( nick, userTypingWord ) {
        if( userTypingWord == this.words[ this.quizIdx ]) {
            this.broadcastMessage(`${nick} 님이 맞추셨습니다!`);
            this.broadcastNextWord();
            return true;
        }

        return false;
    }
}


module.exports = ChosungGame;
