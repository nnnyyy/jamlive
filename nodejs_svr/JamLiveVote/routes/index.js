var express = require('express');
var JamLive = require('./jamlive');
var Log = require('./Log');
var router = express.Router();
var config = require('../config');
var Auth = require('./Auth');
var dbhelper = require('./dbhelper');

/* GET home page. */
router.use( Log.logging );
router.get('/', function(req, res, next) {
  res.render('index', {servname: config.serv_name, username: req.session.username, userinfo: req.session.userinfo});
});

router.get('/new', function(req,res, next) {
  res.render('indexSuwon', {servname: config.serv_name, username: req.session.username, userinfo: req.session.userinfo});
})

router.get('/jp', function(req, res, next) {
  res.cookie('lang', 'jp');
  res.redirect('/');
})

router.get('/ko', function(req, res, next) {
  res.cookie('lang', 'ko');
  res.redirect('/');
})

router.get('/ping', function(req, res, next) {
  res.send('pong');
});
router.post('/vote', JamLive.clickevent );
//router.post('/search', JamLive.search );
router.post('/searchex', JamLive.searchNaverMainWeb );
router.post('/searchimage', JamLive.searchex );
router.post('/searchgoogle', JamLive.requestDaumWeb);
router.post('/searchnaver', JamLive.requestNaver);
router.post('/searchdongyo', JamLive.requestDongyo);
router.post('/searchdb', JamLive.requestDB)
router.post('/searchuser', function(req, res, next) {
  dbhelper.searchUser(req.body.query, function(ret) {
    res.json(ret);
  })
})
router.post('/login', Auth.login);
router.post('/logout', Auth.logout);
router.get('/signin', function(req, res, next) {
  res.render('login', {servname: config.serv_name, username: req.session.username, nick: req.session.usernick});
})
router.get('/signup', function(req, res, next) {
  res.render('signup', {servname: config.serv_name, username: req.session.username, nick: req.session.usernick});
})
router.post('/signup_req', Auth.signup);

module.exports = router;