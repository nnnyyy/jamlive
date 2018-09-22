/**
 * Created by nnnyyy on 2018-09-11.
 */
var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    const serverMan = req.serverMan;
    serverMan.redis.get('global-notice', (err,info) => {
        if( !err ) {
            const parsedInfo = JSON.parse(info);
            res.render('index', parsedInfo);
        }
        else {
            res.json({ret: 'error'});
        }
    });
})

router.post('/msg', function( req, res, next) {
    const serverMan = req.serverMan;
    serverMan.broadcastMsg(req.body.msg);
})

router.post('/banbynick', function(req, res, next) {
    const serverMan = req.serverMan;
    serverMan.permanentBanByNick(req.body.nick, res);
})

router.post('/banbyip', function(req, res, next) {
    const serverMan = req.serverMan;
    serverMan.permanentBanByIp(req.body.ip, res);
})

router.post('/update-notice', function(req, res, next) {
    const serverMan = req.serverMan;
    const noticeData = JSON.stringify({notice: req.body.notice });
    serverMan.redis.set('global-notice', noticeData,  (err, info) => {
        if( !err ) {
            serverMan.broadcastUpdateNotice(req.body.notice);
            res.json({ret: 0})
        }
        else {
            res.json({ret: -1, err: err })
        }
    } );
})

module.exports = router;