/**
 * Created by nnnyyy on 2018-05-09.
 */
var Log = require('./Log');
var request = require('request');
var cheerio = require('cheerio');
var iconv = require('iconv-lite');
var async = require('async');
var ServerManager = require('./ServerManager');
var dbhelper = require('./dbhelper');

function isArray(what) {
    return Object.prototype.toString.call(what) === '[object Array]';
}

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

/*
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
*/



exports.requestDB = function( req, res, next ) {
    dbhelper.search(req.body.query, function(ret) {
        res.json(ret);
    })
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

function parcingDaum(data, body) {
    const strContents = new Buffer(body);
    const $ = cheerio.load(iconv.decode(strContents, 'utf-8').toString());
    $('#webdocColl ul.list_info').find('li').each(function(idx){
        const title = $(this).find('.mg_tit').eq(0).text();
        const desc = $(this).find('.desc').eq(0).html();

        data.push({title: title, description: desc});
    })
}

function parcingNaverChinese(data, hdata, body) {
    const strContents = new Buffer(body);
    const $ = cheerio.load(iconv.decode(strContents, 'utf-8').toString());
    $('.kr_dic_section ul.lst_krdic').find('li').each(function(idx){
        const title = $(this).find('p').eq(0).find('.c_b').text() + $(this).find('p').eq(0).find('.word_class2').text();
        const desc = $(this).find('p').eq(1).html();

        data.push({title: title, description: desc});
    })

    $('.hanja_dic_section .dic_search_result').find('dt').each(function(idx) {
        hdata.push({ title: $(this).text().trim(), description: '' });
    })

    $('.hanja_dic_section .dic_search_result').find('dd').each(function(idx) {
        hdata[idx].description = $(this).text().trim();
    })
}

var req_cnt = 0;
exports.searchex = function(req, res, next) {
    var query = req.body.query;
    var type = req.body.type;

    query = query.trim();

    var ip = req.headers['X-Real-IP'] || (req.connection.remoteAddress.substr(7));
    var ipHashed = ip.hashCode().toString();
    if( ServerManager.checkBaned(ipHashed) ) {
        res.json([]);
        return;
    }

    var isGuest = false;

    var sType = 'encyc';
    switch(type) {
        case 0: sType = 'encyc'; break;
        case 1: sType = 'kin'; break;
        case 2: sType = 'blog'; break;
        case 3: sType = 'news'; break;
        case 4: sType = 'image'; break;
    }

    var cached = ServerManager.getCachedSearchResult(sType, query);
    if( cached ) {
        //console.log('cached : ' + query);
        if( isGuest ) {
            //cached = cached.slice(0,1);
        }
        res.json(cached);
        return;
    }

    var isAuthUser = (req.session.auth > 0) ? true : false;

    var api_url = 'https://openapi.naver.com/v1/search/'+ sType +'.json?display=10&query=' + encodeURI(query); // json ??
    if( type == 4 ) {
        api_url += '&sort=sim';
    }

    var clientids = ['zGJt30deH5ozVHAtGvu9', 'RrVyoeWlAzqS736WZDq3', 'V074_asyyV_2Etx5ZtLW', 'niwBM2EN40JlAgR2_B1B', 'UFEvdYw_RtvqrxVNKlYl', 'NhTno6hxnZpTGZUPffvI', 'x8DQ2xYWaeQqVGDZzdL4'];
    var secrets = ['kkusj_izbs', 'ZaMzW0bOM7', 'NCybd8sKXd', 'AltOR9YRrw', 'mKKbFNGP1G', 'foM4QTYU9U', 'vPCM314sAS'];
    var modcnt = clientids.length;


    var clientid = isAuthUser ? clientids[req_cnt%modcnt] : '9mAvhW3E2l83KNBQgOMo';
    var secret = isAuthUser ? secrets[req_cnt%modcnt] : 'ldR40qhxhS';
    req_cnt++;

    var options = {
        url: api_url,
        headers: {'X-Naver-Client-Id':clientid, 'X-Naver-Client-Secret': secret}
    };
    try {
        request.get(options, function (error, response, body) {
            if (!error && response.statusCode == 200 && body) {
                var data = JSON.parse(body).items;
                if( isArray(data) && data.length > 0 ) {
                    if ( type == 4 ) data = data.slice(0,8);
                    else data = data.slice(0,4);
                    ServerManager.setCachedSearchResult(sType, query, data);
                    if( isGuest ) {
                        data = data.slice(0,1);
                    }
                    res.json(data);
                }
                else {
                    res.json([]);
                }
            } else {
                console.log('searchex failed : ' + error + ', ' + (typeof response != 'undefined' ? response.statusCode : '-1' ) );
                res.json([]);
            }
        });
    }
    catch(e){
        res.json([]);
    }
}

exports.requestGoogle = function(req, res, next) {
    var ip = req.headers['X-Real-IP'] || (req.connection.remoteAddress.substr(7));
    var ipHashed = ip.hashCode().toString();
    if( ServerManager.checkBaned(ipHashed) ) {
        res.json([]);
        return;
    }

    var grammer = req.body.grammer;
    var query = req.body.query
    query = query.trim();

    if( grammer ) {
        query = '국립국어원 on Twitter ' + query;
    }

    var isGuest = false;

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
            var data = [];
            if (!error && response.statusCode == 200) {
                parcing(data, body);
                if( isArray(data) && data.length > 0 ) {
                    if( grammer ) data = data.slice(0,1);
                    else data = data.slice(0,4);
                    ServerManager.setCachedSearchResult('google', query, data);
                    if( isGuest ) {
                        //data = data.slice(0,1);
                    }
                    res.json(data);
                }
                else {
                    res.json([]);
                }
            } else {
                console.log('google search failed : ' + error + ', ' + (typeof response != 'undefined' ? response.statusCode : '-1' ) );
                res.json([]);
            }
        });
    }
    catch(e){
        console.log('request google error - ' + e);
        res.json([]);
    }


}


exports.requestDaumWeb = function(req, res, next) {
    var ip = req.headers['X-Real-IP'] || (req.connection.remoteAddress.substr(7));
    var ipHashed = ip.hashCode().toString();
    if( ServerManager.checkBaned(ipHashed) ) {
        res.json([]);
        return;
    }

    var query = req.body.query
    query = query.trim();

    var isGuest = false;

    var cached = ServerManager.getCachedSearchResult('google', query);
    if( cached ) {
        //console.log('cached : ' + query);
        if( isGuest ) {
            //cached = cached.slice(0,1);
        }
        res.json(cached);
        return;
    }

    var url = 'https://search.daum.net/search?w=web&DA=SBC&q=' +   encodeURI(query);

    var options = {
        url: url,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36",
        }
        ,encoding: null
    };
    try {
        request.get(options, function (error, response, body) {
            var data = [];
            if (!error && response.statusCode == 200) {
                parcingDaum(data, body);
                if( isArray(data) && data.length > 0 ) {
                    data = data.slice(0,4);
                    ServerManager.setCachedSearchResult('google', query, data);
                    if( isGuest ) {
                        data = data.slice(0,1);
                    }
                    res.json(data);
                }
                else {
                    res.json([]);
                }
            } else {
                console.log('google search failed : ' + error + ', ' + (typeof response != 'undefined' ? response.statusCode : '-1' ) );
                res.json([]);
            }
        });
    }
    catch(e){
        console.log('request google error - ' + e);
        res.json([]);
    }


}

exports.requestNaver = function(req, res, next) {
    var ip = req.headers['X-Real-IP'] || (req.connection.remoteAddress.substr(7));
    var ipHashed = ip.hashCode().toString();
    if( ServerManager.checkBaned(ipHashed) ) {
        res.json([]);
        return;
    }

    var query = req.body.query
    query = query.trim();

    var isGuest = false;

    var cached = ServerManager.getCachedSearchResult('naver_chinese', query);
    var cached_h = ServerManager.getCachedSearchResult('naver_chinese_h', query);
    if( cached || cached_h ) {
        //console.log('cached : ' + query);
        if( isGuest ) {
            cached = cached.slice(0,1);
            cached_h = cached_h.slice(0,1);
        }
        res.json({ data: cached, hdata: cached_h });
        return;
    }

    var url = 'https://dict.naver.com/search.nhn?dicQuery=' +   encodeURI(query);

    var options = {
        url: url,
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 6.3; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/56.0.2924.87 Safari/537.36",
        }
        ,encoding: null
    };
    try {
        request.get(options, function (error, response, body) {
            var data = [];
            var hanja_data = [];
            if (!error && response.statusCode == 200) {
                parcingNaverChinese(data, hanja_data, body);
                if( isArray(data) && data.length > 0 ) {
                    data = data.slice(0,4);
                    ServerManager.setCachedSearchResult('naver_chinese', query, data);
                    ServerManager.setCachedSearchResult('naver_chinese_h', query, hanja_data);
                    if( isGuest ) {
                        data = data.slice(0,1);
                        hanja_data = hanja_data.slice(0,1);
                    }
                    res.json({data: data, hdata: hanja_data });
                }
                else {
                    res.json([]);
                }
            } else {
                console.log('google search failed : ' + error + ', ' + (typeof response != 'undefined' ? response.statusCode : '-1' ) );
                res.json([]);
            }
        });
    }
    catch(e){
        console.log('request google error - ' + e);
        res.json([]);
    }


}