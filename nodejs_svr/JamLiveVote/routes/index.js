console.log('load index.js');

var express = require('express');
var JamLive = require('./jamlive');
var Log = require('./Log');
var router = express.Router();

/* GET home page. */
router.use( Log.logging );
router.get('/', function(req, res, next) {
  res.render('index');
});
router.post('/vote', JamLive.clickevent );

module.exports = router;