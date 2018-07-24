var express = require('express');
var JamLive = require('./jamlive');
var Log = require('./Log');
var router = express.Router();
var config = require('../config');
var Auth = require('./Auth');


/* GET home page. */
router.use( Log.logging );
router.get('/', function(req, res, next) {
  res.render('index_new', {servname: config.serv_name, username: req.session.username, nick: req.session.usernick});
});

router.get('/new', function(req,res, next) {
  res.render('index_3rd', {servname: config.serv_name, username: req.session.username, nick: req.session.usernick, auth: req.session.auth});
})
router.get('/ping', function(req, res, next) {
  res.send('pong');
});
router.post('/vote', JamLive.clickevent );
//router.post('/search', JamLive.search );
router.post('/searchex', JamLive.searchex );
router.post('/searchgoogle', JamLive.requestGoogle);
router.post('/searchnaver', JamLive.requestNaver);
router.post('/searchdb', JamLive.requestDB)
router.post('/login', Auth.login);
router.post('/logout', Auth.logout);
router.get('/signin', function(req, res, next) {
  console.log(req.session.username);
  res.render('login', {servname: config.serv_name, username: req.session.username, nick: req.session.usernick});
})
router.get('/signup', function(req, res, next) {
  res.render('signup', {servname: config.serv_name, username: req.session.username, nick: req.session.usernick});
})
router.post('/signup_req', Auth.signup);

module.exports = router;