/**
 * Created by nnnyyy on 2018-09-11.
 */
var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    const serverMan = req.serverMan;
    res.render('index', {});
})

router.post('/msg', function( req, res, next) {
    const serverMan = req.serverMan;
    serverMan.broadcastMsg(req.body.msg);
})

module.exports = router;