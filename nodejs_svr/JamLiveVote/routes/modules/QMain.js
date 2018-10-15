/**
 * Created by nnnyyy on 2018-08-29.
 */

var dbhelper = require('../dbhelper');

exports.QuizSearch = function( req, res, next ) {
    dbhelper.searchQuiz(req.body.keyword, function(result) {
        res.json(result);
    });
}

exports.QuizModify = function(req, res, next) {
    console.log(req.body.sn);
    console.log(req.body.collect_idxM);
    console.log(req.body.questionM);
    console.log(req.body.answer1M);
    console.log(req.body.answer2M);
    console.log(req.body.answer3M);
    res.json({ret: 0});
}