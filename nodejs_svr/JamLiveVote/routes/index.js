var express = require('express');
var Auth = require('./Auth');
var Log = require('./Log');
var Admin = require('./admin');
var async = require('async');
var router = express.Router();

/* GET home page. */
router.use( Log.logging );
router.get('/', function(req, res, next) {
  res.render('index');
});

module.exports = router;
