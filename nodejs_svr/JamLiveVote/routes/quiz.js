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
    dbhelper.getQuizList(function(result) {
        res.json(result);
    })
})

module.exports = router;
