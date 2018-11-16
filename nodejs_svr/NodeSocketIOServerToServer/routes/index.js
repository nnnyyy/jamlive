/**
 * Created by nnnyyy on 2018-09-11.
 */
var express = require('express');
var router = express.Router();
const Auth = require('./Auth');

router.use(function(req,res, next) {
    const serverMan = req.serverMan;
    let isAccessApprove = false;
    let isLogined = req.session.username != null;

    try {
        if( isLogined ) {
            if( req.session.userinfo.adminMemberVal >= 1 ) {
                isAccessApprove = true;
            }
        }
    }catch(e) {

    }

    req.loginInfo = { isAcessable: isAccessApprove, isLogined: isLogined, servers: serverMan.servinfo.values() };
    next();
});

router.get('/', function(req, res, next) {
    const serverMan = req.serverMan;

    serverMan.redis.get('global-notice', (err,info) => {
        if( !err ) {
            let parsedInfo = JSON.parse(info);
            if( !parsedInfo ) {
                parsedInfo = {notice: ''};
            }
            req.loginInfo.notice = parsedInfo.notice;

            res.render('index', req.loginInfo );
        }
        else {
            res.json({ret: 'error'});
        }
    });
});

router.get('/msg', function(req,res,next) {
    try {
        res.render('menu/serverMsg', req.loginInfo );
    }catch(e) {

    }
});

router.post('/login', Auth.login );

router.post('/msg', function( req, res, next) {
    const serverMan = req.serverMan;
    serverMan.broadcastMsg(req.body.msg);
});

router.post('/rsr', function( req, res, next) {
    const serverMan = req.serverMan;
    const packet = {
        msg: req.body.msg,
        btnMsg: req.body.btnMsg,
        word: req.body.word
    }
    serverMan.broadcastToAllVoteServer('rsr', packet);
});

router.post('/banbynick', function(req, res, next) {
    const serverMan = req.serverMan;
    serverMan.permanentBanByNick(req.body.nick, res);
})

router.post('/setServerLimit', function(req,res, next) {
    const serverMan = req.serverMan;
    if( req.session.userinfo.adminMemberVal < 1 ) {
        res.json({ret: -1});
        return;
    }
    serverMan.setServerLimit(req.body.name, req.body.limit, res);
});

router.post('/freezechat', function(req,res,next) { req.serverMan.FreezeChat(req,res); });

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