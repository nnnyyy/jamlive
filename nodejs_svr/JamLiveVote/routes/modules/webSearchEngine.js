/**
 * Created by nnnyy on 2018-09-17.
 */
'use strict'

var request = require('request');
var cheerio = require('cheerio');
var iconv = require('iconv-lite');

function isArray(what) {
    return Object.prototype.toString.call(what) === '[object Array]';
}

class WebSearchEngine {
    constructor(servman) {
        this.servman = servman;
        this.req_cnt = 0;
    }

    searchDic( query, client ) {
        const PROTOCOL = 'search-dic';
        if( !client ) return;
        const wse = this;
        query = query.trim();
        var cached = this.servman.getCachedSearchResult('naver_chinese', query);
        var cached_h = this.servman.getCachedSearchResult('naver_chinese_h', query);
        var cached_e = this.servman.getCachedSearchResult('naver_chinese_e', query);
        if( cached || cached_h || cached_e ) {
            client.socket.emit(PROTOCOL, { data: cached, hdata: cached_h, edata: cached_e });
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
                    wse.parcingNaverChinese(data, hanja_data, endic_data, body);
                    if( isArray(data) && data.length > 0 ) {
                        data = data.slice(0,4);
                        wse.servman.setCachedSearchResult('naver_chinese', query, data);
                        wse.servman.setCachedSearchResult('naver_chinese_h', query, hanja_data);
                        wse.servman.setCachedSearchResult('naver_chinese_e', query, endic_data);
                        client.socket.emit(PROTOCOL, {data: data, hdata: hanja_data, edata: endic_data });
                    }
                    else {
                        client.socket.emit(PROTOCOL, {data: [], hdata: [], edata: []});
                    }
                } else {
                    console.log('searchDic failed : ' + error + ', ' + (typeof response != 'undefined' ? response.statusCode : '-1' ) );
                    client.socket.emit(PROTOCOL, {data: [], hdata: [], edata: []});
                }
            });
        }
        catch(e){
            console.log('searchDic error - ' + e);
            client.socket.emit(PROTOCOL, {data: [], hdata: [], edata: []});
        }
    }

    parcingNaverChinese(data, hdata, endic_data, body) {
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
            console.log(e);
        }
    }


    searchNaverMain(query, client) {
        if( !this.servman.isLiveQuizTime() ) {
            if( !client.isAdmin() ) {
                this.servman.sendServerMsg(client.socket, '네이버 검색은 라이브 퀴즈 시간에만 사용 가능');
                return;
            }
            else {
                this.servman.sendServerMsg(client.socket, '관리자니까 라이브 퀴즈 시간 아니어도 네이버 검색 허용');
            }
        }
        const PROTOCOL = 'search-naver-main';
        const wse = this;
        query = query.trim();
        var cached = this.servman.getCachedSearchResult('naver_main', query);
        if( cached ) {
            client.socket.emit(PROTOCOL, cached);
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
                    wse.parcingNaverMainWeb(data, body);
                    if( data && data.length != 0 ) {
                        wse.servman.setCachedSearchResult('naver_main', query, data);
                        client.socket.emit(PROTOCOL, data);
                    }
                    else {
                        client.socket.emit(PROTOCOL, []);
                    }
                } else {
                    console.log('naver main search failed : ' + error + ', ' + (typeof response != 'undefined' ? response.statusCode : '-1' ) );
                    client.socket.emit(PROTOCOL, []);
                }
            });
        }
        catch(e){
            console.log('request google error - ' + e);
            client.socket.emit(PROTOCOL, []);
        }
    }

    parcingNaverMainWeb( data, body ) {
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

    searchDaum(query, client) {
        const wse = this;
        const PROTOCOL = 'search-daum';
        query = query.trim();
        var cached = this.servman.getCachedSearchResult('google', query);
        if( cached ) {
            client.socket.emit(PROTOCOL, cached);
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
                    wse.parcingDaum(data, body);
                    if( isArray(data) && data.length > 0 ) {
                        data = data.slice(0,4);
                        wse.servman.setCachedSearchResult('google', query, data);
                        client.socket.emit(PROTOCOL, data);
                    }
                    else {
                        client.socket.emit(PROTOCOL, []);
                    }
                } else {
                    console.log('google search failed : ' + error + ', ' + (typeof response != 'undefined' ? response.statusCode : '-1' ) );
                    client.socket.emit(PROTOCOL, []);
                }
            });
        }
        catch(e){
            console.log('request google error - ' + e);
            client.socket.emit(PROTOCOL, []);
        }
    }

    parcingDaum(data, body) {
        const strContents = new Buffer(body);
        const $ = cheerio.load(iconv.decode(strContents, 'utf-8').toString());
        $('#webdocColl ul.list_info').find('li').each(function(idx){
            const title = $(this).find('.mg_tit').eq(0).text();
            const desc = $(this).find('.desc').eq(0).html();

            data.push({title: title, description: desc});
        })
    }

    searchImage( query, client ) {
        const wse = this;
        const PROTOCOL = 'search-image';

        query = query.trim();

        var sType = 'image';
        var cached = this.servman.getCachedSearchResult(sType, query);
        if( cached ) {
            client.socket.emit(PROTOCOL, cached);
            return;
        }

        var api_url = 'https://openapi.naver.com/v1/search/'+ sType +'.json?display=10&query=' + encodeURI(query) + '&sort=sim';
        var clientids = ['kChODmZtLjX7dHIAzwfE', 'j96P2WA6Gayk3krOxehd', '_iBtKrpgLolUtJhXPDUg', 'Til0PbZbqubnmFNgTvGL', '4NRIgHcJlNKT6R3gTvyv', 'ooCDH_d8imisrpnUcp1d', 'VZ9vuXcJh36t7IuDAeCW','zGJt30deH5ozVHAtGvu9', 'RrVyoeWlAzqS736WZDq3', 'V074_asyyV_2Etx5ZtLW', 'niwBM2EN40JlAgR2_B1B', 'UFEvdYw_RtvqrxVNKlYl', 'NhTno6hxnZpTGZUPffvI', 'x8DQ2xYWaeQqVGDZzdL4'];
        var secrets = ['eOlQyyDe_6', 'RRnTqf23kL', 'MleZciknEa', 'eOSv5IigLL', 'P4wN5u9RXR', 'TfQpAeDrwO', 'cP_ecRsKYR','kkusj_izbs', 'ZaMzW0bOM7', 'NCybd8sKXd', 'AltOR9YRrw', 'mKKbFNGP1G', 'foM4QTYU9U', 'vPCM314sAS'];
        var modcnt = clientids.length;


        var clientid = clientids[this.req_cnt%modcnt];
        var secret = secrets[this.req_cnt%modcnt];
        this.req_cnt++;

        var options = {
            url: api_url,
            headers: {'X-Naver-Client-Id':clientid, 'X-Naver-Client-Secret': secret}
        };
        try {
            request.get(options, function (error, response, body) {
                if (!error && response.statusCode == 200 && body) {
                    try {
                        var data = JSON.parse(body).items;
                        if( isArray(data) && data.length > 0 ) {
                            data = data.slice(0,8);
                            wse.servman.setCachedSearchResult(sType, query, data);
                            client.socket.emit(PROTOCOL, data);
                        }
                        else {
                            client.socket.emit(PROTOCOL, []);
                        }
                    }
                    catch(e) {
                        console.log(e);
                    }
                } else {
                    //console.log('searchex failed : ' + error + ', ' + (typeof response != 'undefined' ? response.statusCode : '-1' ) );
                    client.socket.emit(PROTOCOL, []);
                }
            });
        }
        catch(e){
            client.socket.emit(PROTOCOL, []);
        }
    }
}

module.exports = WebSearchEngine;