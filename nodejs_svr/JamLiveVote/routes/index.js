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
router.get('/ping', function(req, res, next) {
  res.send('pong');
});
router.post('/vote', JamLive.clickevent );
router.post('/search', JamLive.search );
router.post('/searchex', JamLive.searchex );
router.post('/searchgoogle', JamLive.requestGoogle);
router.post('/login', Auth.login);
router.post('/logout', Auth.logout);

module.exports = router;