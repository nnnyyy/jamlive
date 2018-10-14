/**
 * Created by nnnyyy on 2018-08-29.
 */

var dbhelper = require('../dbhelper');

exports.QuizSearch = function( req, res, next ) {
    dbhelper.searchQuiz(req.body.keyword, function(result) {
        res.json(result);
    });
}