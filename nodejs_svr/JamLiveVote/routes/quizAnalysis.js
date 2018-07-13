/**
 * Created by nnnyyy on 2018-07-12.
 */
var HashMap = require('hashmap');

var QuizItemForAnalysis = function() {
    this.collect = 0;
    this.voteUserPerIdx = new HashMap();
    this.voteUserPerIdx.set(0, new HashMap());
    this.voteUserPerIdx.set(1, new HashMap());
    this.voteUserPerIdx.set(2, new HashMap());
}

var QuizAnalysis = function() {
    this.isRunning = false;
    this.curQuizItem = null;
    this.collectUsers = new HashMap();
    this.result = [];
    this.step = 0;
}

var obj = new QuizAnalysis();

QuizAnalysis.prototype.init = function() {
    this.isRunning = false;
    this.curQuizItem = null;
    this.collectUsers.clear();
    this.step = 0;
}

QuizAnalysis.prototype.run = function() {
    try {
        if( this.isRunning ) {
            this.init();
            return -1;
        }

        this.isRunning = true;
        this.result = [];
        this.step = 1;
        return 0;

    }catch( e ) {
        this.init();
        return -1;
    }
}

QuizAnalysis.prototype.quizStart = function() {
    try {
        if( this.curQuizItem ) {
            this.init();
            return -1;
        }
        this.curQuizItem = new QuizItemForAnalysis();
        this.step = 2;
        return 0;
    }catch( e ) {
        this.init();
        return -1;
    }
}

QuizAnalysis.prototype.vote = function(client, idx) {
    try {
        if( !this.isQuizDataEngaged() ) {
            return;
        }

        var map = this.curQuizItem.voteUserPerIdx.get(idx);
        if( !map.get(client) ) {
            map.set(client, 1);
        }

    }catch( e ) {
        this.init();
        return -1;
    }
}

QuizAnalysis.prototype.quizEnd = function(collect) {
    try {
        collect = Number(collect);
        if( !this.isQuizDataEngaged() ) {
            this.init();
            return -1;
        }

        //  정답을 투표한 유저에 한해서
        var map = this.curQuizItem.voteUserPerIdx.get(collect);
        map.forEach(function(value, key) {
            if( !obj.collectUsers.get(key) ) {
                obj.collectUsers.set(key , 1 );
            }
            else {
                var cnt = obj.collectUsers.get(key);
                obj.collectUsers.set(key, cnt + 1);
            }
        })

        this.curQuizItem = null;
        this.step = 3;
        return 0;
    }catch( e ) {
        this.init();
        return -1;
    }
}

QuizAnalysis.prototype.end = function() {
    try {
        if( !this.isRunning ) {
            this.init();
            return -1;
        }
        this.collectUsers.forEach(function(value, key) {
            if( key ) {
                console.log(key.nick + ' : ' + value);
                obj.result.push({nick: key.nick, collect: value });
            }
        });

        this.init();
        return 0;
    }catch( e ) {
        this.init();
        return -1;
    }

}

QuizAnalysis.prototype.isQuizDataEngaged = function () {
    return ( this.isRunning && this.curQuizItem );
}

module.exports = obj;