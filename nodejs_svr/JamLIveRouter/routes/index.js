var express = require('express');
var router = express.Router();
const HashMap = require('hashmap');

const ioclient = require('socket.io-client');
//const socketToCenterServer = ioclient.connect('http://127.0.0.1:7777', {reconnect: true });
const socketToCenterServer = ioclient.connect('http://databucket.duckdns.org:7777', {reconnect: true });
var servInfoMan = new HashMap();
var servnameConvert = new HashMap();
servnameConvert.set('1', '서버1');
servnameConvert.set('2', '서버2');
servnameConvert.set('3', '서버3');
servnameConvert.set('4', '서버4');
servnameConvert.set('5', '서버5');

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
        servInfoMan.set(data[i].name, {cnt: data[i].cnt, limit: data[i].limit, url: data[i].url, tLastRecv: new Date()});
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

  var tCur = new Date();

  if( !servnameConvert.has(req.body.servidx) ) {
    res.json({ret: -1, msg: '서버 오류'});
    return;
  }
  else {
    const servRealName = servnameConvert.get(req.body.servidx);
    if( !servInfoMan.has(servRealName) ) {
      res.json({ret: -1, msg: '서버가 죽었어요. 다른 서버로'});
      return;
    }

    var servinfo = servInfoMan.get(servRealName);
    if( tCur - servinfo.tLastRecv >= 5000 ) {
      res.json({ret: -1, msg: '서버가 죽었어요. 다른 서버로'});
      return;
    }

    if( servinfo.cnt >= servinfo.limit ) {
      res.json({ret: -1, msg: '서버에 사용자가 많습니다. 다른서버로'});
      return;
    }

    client.socket.emit('go', {ret: 0, url: servinfo.url});
  }

  res.json({ret: 0, url: info.url});

});



module.exports = router;