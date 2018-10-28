var express = require('express');
var router = express.Router();
const HashMap = require('hashmap');
var config = require('../config');
const dbhelper = require('./dbhelper');
const Auth = require('./Auth');

const ioclient = require('socket.io-client');

/* GET home page. */
router.use(function(req,res,next) {
    next();
});
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/m', function(req, res, next) {
    const isLogined = req.session.username != null;
  res.render('indexMobile', {logined: isLogined });
});

router.get('/pc', function(req, res, next) {
    const isLogined = req.session.username != null;
    res.render('indexPc', {logined: isLogined });
});

router.get('/signup', function(req, res, next) {
    const isLogined = req.session.username != null;
    res.render('signup', {logined: isLogined });
});

router.get('/login', function(req,res,next) {
    const isLogined = req.session.username != null;
    res.render('login', {logined: isLogined });
});

router.get('/about', function( req, res, next) {
    res.render('about');
});

router.get('/quizshow', function( req, res, next) {
    res.render('quizshow');
});

router.post('/signup_req', Auth.signup );
router.post('/login', Auth.login );
router.post('/logout', Auth.logout );

router.post('/go', function( req, res , next) {

    const servman = req.serverMan;
    const center = servman.center;

    var tCur = new Date();

    if( !center.servnameConvert.has(req.body.servidx) ) {
    res.json({ret: -1, msg: '서버 오류'});
    return;
    }
    else {
    const servRealName = center.servnameConvert.get(req.body.servidx);
    if( !center.servInfoList.has(servRealName) ) {
      res.json({ret: -1, msg: '서버가 죽었어요. 다른 서버로'});
      return;
    }

    var servinfo = center.servInfoList.get(servRealName);
    if( tCur - servinfo.tLastRecv >= 5000 ) {
      res.json({ret: -1, msg: '서버가 죽었어요. 다른 서버로'});
      return;
    }

    if( servinfo.cnt >= servinfo.limit ) {
      res.json({ret: -1, msg: '서버에 사용자가 많습니다. 다른서버로'});
      return;
    }
      res.json({ret: 0, url: servinfo.url});
    }
});



module.exports = router;