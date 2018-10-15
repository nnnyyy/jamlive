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
    dbhelper.modifyQuiz(req.body.sn, req.body.questionM, req.body.answer1M, req.body.answer2M, req.body.answer3M, req.body.collect_idxM, function(result) {
        res.json(result);
    });
}

exports.QuizDelete = function( req, res , next ) {
    dbhelper.deleteQuiz(req.body.sn, function(result) {
        res.json(result);
    });
}

exports.QuizInsert = function( req, res, next ) {
    dbhelper.insertQuiz(req.body.q, req.body.a1, req.body.a2, req.body.a3, req.body.ci, function(result) {
        res.json(result);
    });
}