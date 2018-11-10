/**
 * Created by nnnyy on 2018-09-17.
 */
'use strict'

var request = require('request');
var cheerio = require('cheerio');
var iconv = require('iconv-lite');
const HashMap = require('hashmap');
const async = require('async');
const Promise = require('promise');

function isArray(what) {
    return Object.prototype.toString.call(what) === '[object Array]';
}

class CachedSearchData {
    constructor() {
        this.searched = new HashMap();
    }
};

function checkCachedWord(wse,type,jobj) {
    return new Promise(function(resolve, reject) {
        wse.rm.get(`search:${type}:${jobj.query}`, function(err, item) {
            if( item ) {
                jobj.searched = true;
                jobj.desc = JSON.parse(item).data;
            }
            resolve([wse, type, jobj]);
        });
    });
}

function setCachedWord(wse, type, query, data) {
    return new Promise(function(resolve, reject) {
        wse.rm.set(`search:${type}:${query}`, data, 'EX', 120, function(err){
            resolve();
        });
    });
}

class WebSearchEngine {
    constructor(servman) {
        this.servman = servman;
        this.rm = servman.rm.client;
        this.req_cnt = 0;
        this.clientids = ['kChODmZtLjX7dHIAzwfE', 'j96P2WA6Gayk3krOxehd', '_iBtKrpgLolUtJhXPDUg', 'Til0PbZbqubnmFNgTvGL', '4NRIgHcJlNKT6R3gTvyv', 'ooCDH_d8imisrpnUcp1d', 'VZ9vuXcJh36t7IuDAeCW','zGJt30deH5ozVHAtGvu9', 'RrVyoeWlAzqS736WZDq3', 'V074_asyyV_2Etx5ZtLW', 'niwBM2EN40JlAgR2_B1B', 'UFEvdYw_RtvqrxVNKlYl', 'NhTno6hxnZpTGZUPffvI', 'x8DQ2xYWaeQqVGDZzdL4'];
        this.secrets = ['eOlQyyDe_6', 'RRnTqf23kL', 'MleZciknEa', 'eOSv5IigLL', 'P4wN5u9RXR', 'TfQpAeDrwO', 'cP_ecRsKYR','kkusj_izbs', 'ZaMzW0bOM7', 'NCybd8sKXd', 'AltOR9YRrw', 'mKKbFNGP1G', 'foM4QTYU9U', 'vPCM314sAS'];
        this.searchedByType = new HashMap();
    }

    onSearch(user, packet) {
        try {
            if( packet.searchDic )
                this.searchDic(packet.msg, user);
            if( user.userinfo.auth >= 4 ) {
                var bSearch = false;
                for( var i = 0 ; i < packet.searchNaverMainAPI.length ; ++i ) {
                    if( packet.searchNaverMainAPI[i] ) {
                        bSearch = true;
                        break;
                    }
                }
                if( bSearch ) {
                    this.searchNaverAPIs(packet.msg, user, packet.searchNaverMainAPI);
                }
            }

            if( packet.searchDaum )
                this.searchDaum(packet.msg, user);
            if( packet.searchImage )
                this.searchImage(packet.msg, user);

            /*
            if( user.userinfo.auth < 1 && servman.isLiveQuizTime() ) {
                user.incActivePoint( 6 );
            }
            */

            user.tLastSearch = new Date();


            if( packet.isBroadcast ) {
                /*
                dbhelper.searchKinWordPerfect(packet.msg, function(result) {
                    if( result.ret == 0 && result.list.length > 0 ) {

                    }
                    else {
                        dbhelper.searchKinWord(packet.msg, 0, function(result) {
                            if( result.ret == 0 && result.list.length > 0 ) {

                            }
                            else {
                                dbhelper.searchKinWord(packet.msg, 1, function(result) {

                                });
                            }
                        });
                    }
                });
                */

                this.addSearchQuery( packet.msg, true );
            }
            else {
                this.addSearchQuery( packet.msg, false );
            }

        }catch(e) {
            console.log(e);
        }
    }

    addSearchQuery( query, bCount ) {
        this.servman.center.sendSearchQuery({ query: query, isCounting: bCount });
    };

    getCachedSearchResult(sType, query) {
        var cachedType = this.searchedByType.get(sType);
        if( !cachedType ) {
            cachedType = new CachedSearchData();
            this.searchedByType.set( sType, cachedType );
        }

        var d = cachedType.searched.get(query);
        if( d != null ) {
            return d.data;
        }

        return null;
    };

    setCachedSearchResult(sType, query, data) {
        var cachedType = this.searchedByType.get(sType);
        if( !cachedType ) {
            cachedType = new CachedSearchData();
            this.searchedByType.set( sType, cachedType );
        }

        var d = cachedType.searched.get(query);
        if( d ) {
            d.tLast = new Date();
            cachedType.searched.set(query, d);
            return;
        }

        cachedType.searched.set(query, {data: data, tLast: new Date()});
    };

    searchDic( query, client ) {
        const PROTOCOL = 'search-dic';
        if( !client ) return;
        const wse = this;
        query = query.trim();

        checkCachedWord(wse, 'dic', {query: query, searched: false, data: '', hdata: '', edatda: ''})
        .then(function(obj) {
            if( obj[2].searched ) { obj[2].data = obj[2].desc; }
            return checkCachedWord(obj[0], 'hdic', obj[2]);
        })
        .then(function(obj) {
            if( obj[2].searched ) { obj[2].hdata = obj[2].desc; }
            return checkCachedWord(obj[0], 'edic', obj[2]);
        })
        .then(function(obj) {
            if( obj[2].searched ) { obj[2].edata = obj[2].desc; }
            if( obj[2].searched ) {
                client.socket.emit(PROTOCOL, { data: obj[2].data, hdata: obj[2].hdata, edata: obj[2].edata });
            }
            else {
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

                                const test = { data: data };
                                const htest = { data: hanja_data };
                                const etest = { data: endic_data };

                                setCachedWord(wse, 'dic', query, JSON.stringify(test))
                                .then(function() {
                                    return setCachedWord(wse, 'hdic', query, JSON.stringify(htest));
                                })
                                .then(function() {
                                    return setCachedWord(wse, 'edic', query, JSON.stringify(etest));
                                })
                                .then(function() {
                                    client.socket.emit(PROTOCOL, {data: data, hdata: hanja_data, edata: endic_data });
                                })
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
        });
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
        var cached = this.getCachedSearchResult('naver_main', query);
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
                        wse.setCachedSearchResult('naver_main', query, data);
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


        checkCachedWord(wse, 'daum', {query: query, searched: false, data: ''})
        .then(function(obj) {
            if (obj[2].searched) {
                client.socket.emit(PROTOCOL, obj[2].desc);
            }
            else {
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
                                wse.setCachedSearchResult('google', query, data);

                                setCachedWord(wse, 'daum', query, JSON.stringify({data: data}))
                                .then(function() {
                                    client.socket.emit(PROTOCOL, data);
                                });
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
        });
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

        checkCachedWord(wse, 'image', {query: query, searched: false, data: ''})
        .then(function(obj) {
            if (obj[2].searched) {
                client.socket.emit(PROTOCOL, obj[2].desc);
            }
            else {
                var api_url = 'https://openapi.naver.com/v1/search/image.json?display=10&query=' + encodeURI(query) + '&sort=sim';
                var modcnt = wse.clientids.length;
                var clientid = wse.clientids[wse.req_cnt%modcnt];
                var secret = wse.secrets[wse.req_cnt%modcnt];
                wse.req_cnt++;

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
                                    console.log(data);

                                    setCachedWord(wse, 'image', query, JSON.stringify({data: data}))
                                    .then(function() {
                                        client.socket.emit(PROTOCOL, data);
                                    });
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
        });
    }

    searchNaverAPIs( query, client, checkedList ) {
        //var search_title_prefix = ['[백과사전]', '[지식인]', '[블로그]', '[뉴스]', '[이미지]','[다음(구글)]', '[백과사전]', '[백과사전]'];
        for( var i = 0 ; i < checkedList.length ; ++i ) {
            if( checkedList[i] )
                this.searchNaverAPI( i, query , client );
        }
    }

    searchNaverAPI( type, query, client ) {
        const wse = this;
        let PROTOCOL = 'search-naver-api';

        query = query.trim();

        var sType = 'encyc';
        var sPrefix = '백과사전';
        switch(type) {
            case 0: sType="encyc"; sPrefix="백과사전"; break;
            case 1: sType="webkr"; sPrefix="웹";break;
            case 2: sType="news"; sPrefix="뉴스";break;
            case 3: sType="kin"; sPrefix="지식인";break;
            case 4: sType="blog"; sPrefix="블로그";break;
        }

        /// -----
        checkCachedWord(wse, sType, {query: query, searched: false, data: ''})
            .then(function(obj) {
                var packet = {data: obj[2].desc, type: type, prefix: sPrefix};
                if( obj[2].searched ) { client.socket.emit(PROTOCOL, packet); }
                else {
                    var api_url = 'https://openapi.naver.com/v1/search/'+ sType +'.json?display=10&query=' + encodeURI(query) + '&sort=sim';
                    var modcnt = wse.clientids.length;


                    var clientid = wse.clientids[wse.req_cnt%modcnt];
                    var secret = wse.secrets[wse.req_cnt%modcnt];
                    wse.req_cnt++;

                    var options = {
                        url: api_url,
                        headers: {'X-Naver-Client-Id':clientid, 'X-Naver-Client-Secret': secret}
                    };
                    try {
                        request.get(options, function (error, response, body) {
                            if (!error && response.statusCode == 200 && body) {
                                try {
                                    var data = JSON.parse(body).items;
                                    var packet = {data: data, type: type, prefix: sPrefix};
                                    if( isArray(data) && data.length > 0 ) {
                                        data = data.slice(0,8);
                                        setCachedWord(wse, sType, query, JSON.stringify({data: data}))
                                        .then(function() {
                                            client.socket.emit(PROTOCOL, packet);
                                        });
                                    }
                                    else {
                                        client.socket.emit(PROTOCOL, packet);
                                    }
                                }
                                catch(e) {
                                    console.log(e);
                                }
                            } else {
                                var packet = {data: [], type: type};
                                //console.log('searchex failed : ' + error + ', ' + (typeof response != 'undefined' ? response.statusCode : '-1' ) );
                                client.socket.emit(PROTOCOL, []);
                            }
                        });
                    }
                    catch(e){
                        client.socket.emit(PROTOCOL, []);
                    }
                }
            });
    }
}

module.exports = WebSearchEngine;