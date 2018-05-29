/**
 * Created by nnnyyy on 2018-05-17.
 */
/**
 * Created by nnnyyy on 2018-04-13.
 */
var express = require('express');
var router = express.Router();
var dbhelper = require('./dbhelper');
var moment = require('moment');
var Log = require('./Log');

router.get('/', function(req, res, next) {
    dbhelper.getQuizDateList(function(result) {
        result.moment = moment;
        res.render('quiz/index', result);
    });
});

router.post('/getquiz', function(req, res, next) {
    var datesn = req.body.date_sn;
    dbhelper.getQuizList(datesn, function(result) {
        res.json(result);
    })
    Log.logger.info("[Quiz] SN : " + datesn + ", Ip : " + req.connection.remoteAddress);
})

router.post('/getrandomquiz', function(req, res, next) {
    dbhelper.getRandomQuizList(function(result) {
        res.json(result);
    })
    Log.logger.info("[RandQuiz] Ip : " + req.connection.remoteAddress);

})

router.post('/quizresult', function(req, res, next) {
    var collect = req.body.collect;
    var quizcnt = req.body.quizcnt;
    Log.logger.info("[Quiz] collect : " + collect + ", quizcnt : " + quizcnt + ", Ip : " + req.connection.remoteAddress);
})

module.exports = router;
