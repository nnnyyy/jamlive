var express = require('express');
var router = express.Router();
const HashMap = require('hashmap');

var servinfo = new HashMap();
const ioclient = require('socket.io-client');
const socketToCenterServer = ioclient.connect('http://databucket.duckdns.org:7777', {reconnect: true });
var servnameConvert = new HashMap();
servnameConvert.set('1', {name: '서버1', url: 'http://databucket.duckdns.org:4650/', limit: 1200 });
servnameConvert.set('2', {name: '서버2', url: 'http://databucket.duckdns.org:5647/', limit: 1200 });
servnameConvert.set('3', {name: '서버3', url: 'http://databucket.duckdns.org:6647/', limit: 1200 });
servnameConvert.set('4', {name: '서버4', url: 'http://databucket.duckdns.org:7647/', limit: 1200 });
servnameConvert.set('5', {name: '서버5', url: 'http://databucket.duckdns.org:8647/', limit: 1200 });

// Add a connect listener
socketToCenterServer.on('connect', function () {
  console.log('connect to center');
  centerConnected = true;
  this.emit('serv-info', { type: "route-server" });
  this.on('disconnect', function() {
    console.log('disconnect from center');
  })

  this.on('user-cnt', function(packet) {
    try {
      const data = packet.data;
      for( var i = 0 ; i < data.length ; ++i ) {
        servinfo.set(data[i].name, data[i].cnt);
      }
    }
    catch(e) {
      console.log(e);
    }
  })
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/new', function(req, res, next) {
  res.render('index');
});

router.post('/go', function( req, res , next) {
  if( !servnameConvert.has(req.body.servidx) ) {
    res.json({ret: -1, msg: '서버 오류'});
    return;
  }
  else {
    const info = servnameConvert.get(req.body.servidx);
    if( !servinfo.has(info.name) ) {
      res.json({ret: -1, msg: '다른 서버를 이용 해 주세요'});
      return;
    }

    var servcnt = servinfo.get(info.name);
    if( servcnt >= info.limit ) {
      res.json({ret: -1, msg: '서버에 사용자가 많습니다. 다른서버로'});
      return;
    }

    res.json({ret: 0, url: info.url});
  }
})



module.exports = router;