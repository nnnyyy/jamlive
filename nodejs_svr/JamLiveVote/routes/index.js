var express = require('express');
var JamLive = require('./jamlive');
var Log = require('./Log');
var router = express.Router();
var request = require('request');
var cheerio = require('cheerio');
var iconv = require('iconv-lite');

/* GET home page. */
router.use( Log.logging );
router.get('/', function(req, res, next) {
  res.render('index_new');
});
router.post('/vote', JamLive.clickevent );
router.post('/search', JamLive.search );
router.get('/test/:query', function(req, res, next) {
  var url = 'https://www.google.co.kr/search?q=' +   encodeURI(req.params.query);

  var options = {
    url: url,
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36",
    }
    ,encoding: null
  };
  try {
    request.get(options, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        parcing(res, body);
      } else {
        res.json(response.statusCode);
        console.log('error = ' + response.statusCode);
      }
    });
  }
  catch(e){
    console.log(e);
  }

})

function parcing(res, body) {
  var strContents = new Buffer(body);
  var $ = cheerio.load(iconv.decode(strContents, 'utf-8').toString());
  var data = [];
  $('#search').find('.g').each(function(idx) {

    var title = $(this).find('h3.r a').text();
    var descDom = $(this).find('.s');
    descDom.find('.f').text('');
    var desc = descDom.find('.st').text();
    data.push({title: title, desc: desc});
  })

  res.json(data);
}

module.exports = router;