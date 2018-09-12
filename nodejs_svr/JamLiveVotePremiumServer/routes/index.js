var express = require('express');
var Log = require('./Log');
var router = express.Router();
var config = require('../config');
var Auth = require('./Auth');
var dbhelper = require('./dbhelper');

/* GET home page. */
router.use( Log.logging );
router.get('/', function(req, res, next) {
  res.render('index', {});
});

module.exports = router;