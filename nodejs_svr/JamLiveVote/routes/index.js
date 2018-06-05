var express = require('express');
var JamLive = require('./jamlive');
var Log = require('./Log');
var router = express.Router();
var request = require('request');


/* GET home page. */
router.use( Log.logging );
router.get('/', function(req, res, next) {
  res.render('index_new');
});
router.post('/vote', JamLive.clickevent );
router.post('/search', JamLive.search );

module.exports = router;