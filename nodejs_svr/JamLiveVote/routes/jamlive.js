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

function parcingNaverChinese(data, hdata, endic_data, body) {
    try {
        const strContents = new Buffer(body);
        const $ = cheerio.load(iconv.decode(strContents, 'utf-8').toString());
        $('.kr_dic_section ul.lst_krdic').find('li').each(function(idx){
            const title = $(this).find('p').eq(0).find('.c_b').text() + $(this).find('p').eq(0).find('.word_class2').text();
            const desc = $(this).find('p').eq(1).html();

            data.push({title: title, description: desc});
        })

        $('.hanja_dic_section .dic_search_result').find('dt').each(function(idx) {
            hdata[idx] = { title: $(this).text().trim(), description: 't' };
        })

        $('.hanja_dic_section .dic_search_result').find('dd').each(function(idx) {
            if( hdata[idx] && hdata[idx].description )
                hdata[idx].description = $(this).text().trim();
        })

        $('.en_dic_section .dic_search_result').find('dt').each(function(idx) {
            endic_data[idx] = { title: $(this).text().trim(), description: 't' };
        })

        $('.en_dic_section .dic_search_result').find('dd').each(function(idx) {
            if( endic_data[idx] && endic_data[idx].description )
                endic_data[idx].description = $(this).text().trim();
        })
    }
    catch(e) {

    }
}

function parcingDongyo(data, body) {
    const strContents = new Buffer(body);
    const $ = cheerio.load(iconv.decode(strContents, 'utf-8').toString());
    const title = $('.col-md-8').eq(0).html();
    const desc = $('.col-md-8').eq(1).html();

    data.push({title: title, description: desc});
}


function parcingNaverMainWeb( data, body ) {
    const strContents = new Buffer(body);
    const $ = cheerio.load(iconv.decode(strContents, 'utf-8').toString());
    const root = $('#main_pack');
    const nNewsRoot = root.find('.news ul');
    nNewsRoot.find('li').each(function(idx) {
        const title = $(this).find('dl dt').text();
        if( title == '' ) return;
        const desc = $(this).find('dl dd').eq(1).html();
        if( !desc || desc == '' ) return;
        const item = {category: '뉴스', title: title, description: desc };
        data.push(item);
    });

    const nBlogRoot = root.find('.blog ul');
    nBlogRoot.find('li').each(function(idx) {
        const title = $(this).find('dl dt').text();
        if( title == '' ) return;
        const desc = $(this).find('dl dd').eq(1).html();
        if( !desc || desc == '' ) return;
        const item = {category: '블로그', title: title, description: desc };
        data.push(item);
    });

    const nPostRoot = root.find('.sp_post ul');
    nPostRoot.find('li').each(function(idx) {
        const title = $(this).find('dl dt').text();
        if( title == '' ) return;
        const desc = $(this).find('dl dd').eq(1).html();
        if( !desc || desc == '' ) return;
        const item = {category: '포스트', title: title, description: desc };
        data.push(item);
    });

    const nWebsiteRoot = root.find('.sp_website ul');
    nWebsiteRoot.find('li').each(function(idx) {
        const title = $(this).find('dl dt').text();
        if( title == '' ) return;
        const desc = $(this).find('dl dd').eq(1).html();
        if( !desc || desc == '' ) return;
        const item = {category: '웹', title: title, description: desc };
        data.push(item);
    });

    const nInRoot = root.find('._kinBase ul');
    nInRoot.find('li').each(function(idx) {
        const title = $(this).find('dl dt').text();
        if( title == '' ) return;
        const desc = $(this).find('dl dd').eq(1).html();
        if( !desc || desc == '' ) return;
        const item = {category: '지식인', title: title, description: desc };
        data.push(item);
    });
}


var req_cnt = 0;
exports.searchex = function(req, res, next) {
    res.json([]);
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


exports.searchNaverMainWeb = function( req, res , next ) {
    var query = req.body.query;
    query = query.trim();

    var cached = ServerManager.getCachedSearchResult('naver_main', query);
    if( cached ) {
        res.json(cached);
        return;
    }

    var url = 'https://search.naver.com/search.naver?where=nexearch&query=' +   encodeURI(query);

    var options = {
        url: url,
        headers: {
            "referer": 'http://m.naver.com',
            "User-Agent": "Mozilla/5.0"
        }
        ,encoding: null
    };
    try {
        request.get(options, function (error, response, body) {
            var data = [];
            if (!error && response.statusCode == 200) {
                parcingNaverMainWeb(data, body);
                if( data && data.length != 0 ) {
                    ServerManager.setCachedSearchResult('naver_main', query, data);
                    res.json(data);
                }
                else {
                    res.json([]);
                }
            } else {
                //console.log('naver main search failed : ' + error + ', ' + (typeof response != 'undefined' ? response.statusCode : '-1' ) );
                res.json([]);
            }
        });
    }
    catch(e){
        //console.log('request google error - ' + e);
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
    var cached_e = ServerManager.getCachedSearchResult('naver_chinese_e', query);
    if( cached || cached_h || cached_e ) {
        //console.log('cached : ' + query);
        if( isGuest ) {
            cached = cached.slice(0,1);
            cached_h = cached_h.slice(0,1);
            cached_e = cached_e.slice(0,1);
        }
        res.json({ data: cached, hdata: cached_h, edata: cached_e });
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
            var endic_data = [];
            if (!error && response.statusCode == 200) {
                parcingNaverChinese(data, hanja_data, endic_data, body);
                if( isArray(data) && data.length > 0 ) {
                    data = data.slice(0,4);
                    ServerManager.setCachedSearchResult('naver_chinese', query, data);
                    ServerManager.setCachedSearchResult('naver_chinese_h', query, hanja_data);
                    ServerManager.setCachedSearchResult('naver_chinese_e', query, endic_data);
                    if( isGuest ) {
                        data = data.slice(0,1);
                        hanja_data = hanja_data.slice(0,1);
                        endic_data = endic_data.slice(0,1);
                    }
                    res.json({data: data, hdata: hanja_data, edata: endic_data });
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

exports.requestDongyo = function(req, res, next) {
    var ip = req.headers['X-Real-IP'] || (req.connection.remoteAddress.substr(7));
    var ipHashed = ip.hashCode().toString();
    if( ServerManager.checkBaned(ipHashed) ) {
        res.json([]);
        return;
    }

    var query = req.body.query
    query = query.trim();

    var isGuest = false;

    var cached = ServerManager.getCachedSearchResult('dongyo', query);
    if( cached ) {
        if( isGuest ) {
            cached = cached.slice(0,1);
        }
        res.json({ data: cached });
        return;
    }

    var url = 'https://gasazip.com/view.html?singer2=%EB%8F%99%EC%9A%94&title2=' +   encodeURI(query);

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
                parcingDongyo(data, body);
                if( isArray(data) && data.length > 0 ) {
                    data = data.slice(0,4);
                    ServerManager.setCachedSearchResult('dongyo', query, data);
                    if( isGuest ) {
                        data = data.slice(0,1);
                        hanja_data = hanja_data.slice(0,1);
                    }
                    res.json({data: data });
                }
                else {
                    res.json([]);
                }
            } else {
                console.log('requestDongyo failed : ' + error + ', ' + (typeof response != 'undefined' ? response.statusCode : '-1' ) );
                res.json([]);
            }
        });
    }
    catch(e){
        console.log('requestDongyo error - ' + e);
        res.json([]);
    }


}