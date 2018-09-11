/**
 * Created by nnnyyy on 2018-09-11.
 */
var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
    res.render('index', {});
})

module.exports = router;