/**
 * Created by nnnyyy on 2018-05-17.
 */
/**
 * Created by nnnyyy on 2018-04-13.
 */
var moment = require('moment');
var Log = require('./Log');

var selected = null;
var quizDataObj = function(_quizdata, io) {
    // {idx: d.quiz_idx, question: d.question ,answer: [d.answer1, d.answer2, d.answer3], collect: d.collect_idx}
    this.data = _quizdata;
    this.io = io;
    this.cnts = [0,0,0];
    this.bEnd = false;
    this.io.sockets.emit('quiz', {quizdata: _quizdata});
    this.tLastEnd = 0;
    selected = this;
    setTimeout(this.sendRet, 10000);
}

quizDataObj.prototype.sendRet = function() {
    var collect_cnt = selected.cnts[selected.data.collect];
    var total_cnt = selected.cnts[0] + selected.cnts[1] + selected.cnts[2];
    selected.io.sockets.emit('quizret', {collect_cnt: collect_cnt, total_cnt: total_cnt, collect_idx: selected.data.collect });
    selected.bEnd = true;
    selected.tLastEnd = new Date();
}

quizDataObj.prototype.vote = function(idx) {
    if( idx < 0 || idx > 2) return;
    this.cnts[idx]++;
}

quizDataObj.prototype.isEnd = function() {
    return this.bEnd;
}

module.exports = quizDataObj;