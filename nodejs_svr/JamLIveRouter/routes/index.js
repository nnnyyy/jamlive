var express = require('express');
var router = express.Router();
const HashMap = require('hashmap');
var config = require('../config');

const ioclient = require('socket.io-client');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/m', function(req, res, next) {
  res.render('indexMobile');
});

router.get('/new', function(req, res, next) {
  res.render('index');
});

router.post('/go', function( req, res , next) {
    console.log('!!');

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