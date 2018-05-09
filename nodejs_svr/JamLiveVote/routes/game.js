/**
 * Created by nnnyyy on 2018-04-13.
 */
var express = require('express');
var router = express.Router();
var dbhelper = require('./dbhelper');
var Log = require('./Log');

router.get('/', function(req, res, next) {
    if( req.session.user_id == null ||
        req.session.user_id == '' ) {
        res.redirect('/');
    }else {
        try {
            dbhelper.GetList(function(data) {
                data.session = req.session.user_id;
                res.render('game', data);
            })
        }catch(err) {
            Log.logger.exception( '[' + req.session.user_id + '] DB - GetList Failed');
            res.redirect('/logout');
        }
    }
});

router.get('/mylog', function(req, res, next) {
});

module.exports = router;
