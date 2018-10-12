/**
 * Created by nnnyy on 2018-10-11.
 */
const express = require('express');
let router = express.Router();

router.get('/', function(req,res,next) {
    res.render('index');
});

module.exports = router;