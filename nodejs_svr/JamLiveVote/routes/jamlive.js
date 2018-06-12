/**
 * Created by nnnyyy on 2018-05-09.
 */
var Log = require('./Log');
var request = require('request');
var cheerio = require('cheerio');
var iconv = require('iconv-lite');
var async = require('async');
var ServerManager = require('./ServerManager');

function VoteObj() {
    this.countlist = [0,0,0];
}

VoteObj.prototype.getCount = function(idx) {
    return this.countlist[idx];
}

VoteObj.prototype.incCount = function(idx) {
    this.countlist[idx]++;
}

VoteObj.prototype.getJson = function() {
    return [{cnt:this.countlist[0]},{cnt:this.countlist[1]},{cnt:this.countlist[2]} ]
}

var data = new VoteObj();

exports.clickevent = function( req, res, next) {
    try {
        if( req.body.cmd == "add" ) {
            data.incCount(req.body.votenum);
            res.json(data.getJson());
        }
        else {
            res.json(data.getJson());
        }
        //Log.logger.debug('click event called - ' +  req.body.cmd);

    }catch(err) {
        res.json( {cnt:[]} );
    }
}

exports.search = function( req, res, next ) {
    var searched_data = ServerManager.getSearchedData(req.body.query);
    if(searched_data != null) {        
        res.json(searched_data);
        return;
    }

    async.waterfall(
        [
            async.apply(reqFirst, req.body.query),
            requestEncyc,
            requestKIN,
            requestBlog,
            requestGoogle,
            postProc,
        ]
        ,
        function(err, data){
            if( err == null ) {
                ServerManager.setSearchedData(req.body.query, data);
                res.json(data);
            }
            else {
                res.json(err);
            }
        });
}

function reqFirst(query, callback) {
    callback(null, query, []);
}

function requestEncyc(query, data, callback) {
    var api_url = 'https://openapi.naver.com/v1/search/encyc.json?display=10&query=' + encodeURI(query); // json ??

    var options = {
        url: api_url,
        headers: {'X-Naver-Client-Id':'RrVyoeWlAzqS736WZDq3', 'X-Naver-Client-Secret': 'ZaMzW0bOM7'}
    };
    try {
        request.get(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                callback(null, query, data.concat(JSON.parse(body).items));
            } else {
                callback(-1);
            }
        });
    }
    catch(e){
        callback(-1);
    }
}

function requestKIN(query, data, callback) {
    data = data.slice(0,2);
    var api_url = 'https://openapi.naver.com/v1/search/kin.json?display=10&query=' + encodeURI(query); // json ??

    var options = {
        url: api_url,
        headers: {'X-Naver-Client-Id':'RrVyoeWlAzqS736WZDq3', 'X-Naver-Client-Secret': 'ZaMzW0bOM7'}
    };
    try {
        request.get(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                callback(null, query, data.concat(JSON.parse(body).items));
            } else {
                callback(-1);
            }
        });
    }
    catch(e){
        callback(-1);
    }
}

function requestBlog(query, data, callback) {
    data = data.slice(0,4);
    var api_url = 'https://openapi.naver.com/v1/search/blog.json?display=10&query=' + encodeURI(query); // json ??

    var options = {
        url: api_url,
        headers: {'X-Naver-Client-Id':'RrVyoeWlAzqS736WZDq3', 'X-Naver-Client-Secret': 'ZaMzW0bOM7'}
    };
    try {
        request.get(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                callback(null, query, data.concat(JSON.parse(body).items));
            } else {
                callback(-1);
            }
        });
    }
    catch(e){
        callback(-1);
    }
}

function requestGoogle(query, data, callback) {
    if( data.length > 3 ) {
        //  검색결과가 충분하면 구글링 안함        
        callback(null, query, data);
        return;
    }
    data = data.slice(0,4);
    var url = 'https://www.google.co.kr/search?q=' +   encodeURI(query);

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
                parcing(data, body);
                callback(null, query, data);
            } else {
                callback(-1);
            }
        });
    }
    catch(e){
        callback(-1);
    }


}

function shuffle(a) {
    var j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
    return a;
}

function postProc(query, data, callback) {
    // ??
    //shuffle(data);
    callback(null, data);
}

function parcing(data, body) {
    var strContents = new Buffer(body);
    var $ = cheerio.load(iconv.decode(strContents, 'utf-8').toString());
    $('#search').find('.g').each(function(idx) {
        var title = $(this).find('h3.r a').text();
        var descDom = $(this).find('.s');
        descDom.find('.f').text('');
        var desc = descDom.find('.st').html();
        if( title == null || title == '' || desc == null || desc == '' ||
            title.indexOf('- YouTube') > 0 ||
            title.indexOf('- Google Play 앱') > 0 ||
            title.indexOf('• Instagram') > 0 ||
            title.indexOf('| Facebook') > 0  ||
            title.indexOf('on Instagram') > 0 ) {
            return;
        }

        data.push({title: title, description: desc});
    })
}

exports.searchex = function(req, res, next) {
    var query = req.body.query;
    var type = req.body.type;    

    var sType = 'encyc';
    switch(type) {
        case 0: sType = 'encyc'; break;
        case 1: sType = 'kin'; break;
        case 2: sType = 'blog'; break;
    }

    var api_url = 'https://openapi.naver.com/v1/search/'+ sType +'.json?display=10&query=' + encodeURI(query); // json ??

    var options = {
        url: api_url,
        headers: {'X-Naver-Client-Id':'RrVyoeWlAzqS736WZDq3', 'X-Naver-Client-Secret': 'ZaMzW0bOM7'}
    };
    try {
        request.get(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                var data = JSON.parse(body).items;
                if( type == 0 ) data = data.slice(0,2);
                else if( type == 1 ) data = data.slice(0,3);
                res.json(data);
            } else {
                console.log(error);
                res.json([]);
            }
        });
    }
    catch(e){
        callback(-1);
    }
}