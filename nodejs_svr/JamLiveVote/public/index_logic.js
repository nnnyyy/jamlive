/**
 * Created by nnnyyy on 2018-06-28.
 */
var RETRY_INTERVAL = 2000;
var ConnectStateInfo = function() {
    this.isConnected = false;
    this.timeoutID = -1;
}
var connectStateInfo = new ConnectStateInfo();
var tClick = 0;
var bTrigger = false;
var htmlBackup = '';
var timerID = 0;
var timerIDForImageSearch = 0;
var timerIDForDB = 0;
var myid = -1;
var autoSearchWordMap = new Map();
var tLast = 0;
var tAutoSearchFreeze = 0;
var socket = io();
var isLogin = false;
var usernick = '';



ConnectStateInfo.prototype.Connect = function() {
    this.isConnected = true;
    clearInterval( this.timeoutID );
}

ConnectStateInfo.prototype.Disconnect = function() {
    this.isConnected = false;
    setInterval(function() {
        if( !connectStateInfo.isConnected ) {
            $.get('/ping', function(data){
                connectStateInfo.isConnected = true;
                window.location.href = unescape(window.location.pathname);
            })
        }
    }, RETRY_INTERVAL);
}

function registerClickEvent( socket ) {
    $('.youtube_close').click(function(e){
        $('.youtube_video').css('display', 'none');
    });

    $('.youtube_video').css('display', 'none');

    $('.guide_btn').click(function(e){
        $('.youtube_video').css('display', 'inline-block');
    });

    $(document).on('click', '.chat_name', function (e) {
        var name = $(this).text();
        if( confirm('신고가 모이면 이 아이피는 당분간 투표에 참여할 수 없습니다."' + name + '"를 신고하시겠습니까? ') ) {
            socket.emit('ban', {hash: $(this).attr('hash')});
        }
        e.preventDefault();
    });

    $('btn_logout').click(function(e) {
        logout_test();
    })
}

function registerSocketEvent( socket ) {
    socket.on('connect', connectStateInfo.Connect );
    socket.on('disconnect', connectStateInfo.Disconnect);
    socket.on('myid', function(data) {
        myid = data.socket;
    })

    socket.on('vote_data', function(data) {
        var votedata = data.vote_data;
        var users = votedata.users;
        $('vote_user_cnt').text(users);
        $('vote_except').text(votedata.bans);

        var totalCnt = 0;
        var maxVoteCnt = 0;
        for( var i = 0 ; i < votedata.cnt.length ; ++i ) {
            totalCnt += votedata.cnt[i];
            if( maxVoteCnt <= votedata.cnt[i]) {
                maxVoteCnt = votedata.cnt[i];
            }
        }

        var duplicatedMaxVoteCnt = 0;
        for( var i = 0 ; i < votedata.cnt.length ; ++i ) {
            if( maxVoteCnt == votedata.cnt[i] ) {
                duplicatedMaxVoteCnt++;
            }
        }

        if( isMaxVoteDuplicateChecked() && duplicatedMaxVoteCnt >= 2 ) {
            votedata.cnt = [0,0,0];
        }

        var minVoteVal = Number($('min_vote').text());

        if( totalCnt <= minVoteVal) {
            votedata.cnt = [0,0,0];
        }


        showBarChart('.ct-chart',['1번','2번','3번'],[votedata.cnt], {
            seriesBarDistance: 10,
            height: 170,
            axisX: {
                offset: 20
            },
            axisY: {
                offset: 20
            }
        });

        var others = data.others;
        for( var i = 0 ; i < others.length ; ++i ) {
            if( others[i].channel == "chat" ) {
                onChat(others[i].data);
            }
        }
    });

    socket.on('chat', onChat );
    socket.on('serv_msg', onServMsg);
    socket.on('quiz', onQuiz);
    socket.on('quizret', onQuizRet);
    socket.on('effect', onEffect);
}

function onChat(data) {
    if( data.mode == "vote" ) {
        if( data.admin ) {
            data.nickname = '<div class="admin_font">사이트관리자</div>';
        }
        else if( data.isLogin ) {
            data.nickname = '<div class="logined_font">' + data.nickname + '</div>';
        }
        addChat( data.mode, data.isBaned, data.hash, data.nickname, '<b style="color: '+ color[data.vote] + '">' + data.msg + '</b>', false, data.auth);
        setMsgVisible( data.mode, $('#cb_votemsg').is(':checked') ? false : true );
    }
    else if( data.mode == "search") {
        if( data.admin ) {
            data.nickname = '<div class="admin_font">사이트관리자</div>';
        }
        else if( data.isLogin ) {
            data.nickname = '<div class="logined_font">' + data.nickname + '</div>';
        }
        addChat( data.mode, data.isBaned, data.hash, data.nickname, '<b style="color: #1b3440">' + data.msg + '</b>', false, data.auth);
        if( data.id != myid && isAutoSearchChecked() ) {
            var tCur = new Date();
            if( tCur - tAutoSearchFreeze <= 5000) {
                return;
            }

            if( tCur - tLast > 1500 ) {
                autoSearchWordMap.clear();
            }

            tLast = tCur;

            var arr = data.msg.substr(5).split(' ');
            for( var i = 0 ; i < arr.length ; ++i ) {
                autoSearchWordMap.put(arr[i], 1);
            }

            if( autoSearchWordMap.size() >= 3){
                var s = '';
                var aKeys = autoSearchWordMap.keys();
                for( var i = 0 ; i < aKeys.length ; ++i  ) {
                    s += aKeys[i];
                    s += ' ';
                }
                autoSearchWordMap.clear();
                tAutoSearchFreeze = tCur;
                searchWebRoot(this, s, false);
            }
        }
    }
    else if ( data.mode == "notice") {
        addChat( data.mode, data.isBaned, data.hash, '<div class="notice_font">알리미</div>', data.msg, false, data.auth);
    }
    else {

        if( data.admin ) {
            addChat( data.mode, data.isBaned, data.hash, '<div class="admin_font">사이트관리자</div>', data.msg, false, data.auth);
        }
        else if( data.isLogin ) {
            addChat( data.mode, data.isBaned, data.hash, '<div class="logined_font">' + data.nickname + '</div>', data.msg, false, data.auth);
        }
        else {
            addChat( data.mode, data.isBaned, data.hash, data.nickname, data.msg, true, data.auth);
        }

    }

    var rd = Math.floor(Math.random() * 30);
    if( rd == 15 ) {
        addBannerAds();
    }
}

function onServMsg(data) {
    showAdminMsg(data.msg);
}

var tStartQuiz = 0;
var idInterval = -1;
var idTimeout = -1;
function onQuiz(data) {
    $('.q_q').each(function(idx){
        $(this).css('background-color','transparent');
    })
    $('.quiz_wnd').css('display', 'inline-block');
    $('.q_title').text(data.quizdata.question);
    addChat( "", false, 0, '<div class="notice_font">퀴즈</div>', data.quizdata.question, false);
    $('.q_q').each(function(idx) {
        $(this).text((idx+1) + '. ' + data.quizdata.answer[idx]);
    })

    tStartQuiz = new Date();

    clearInterval(idInterval);
    idInterval = setInterval(function() {
        var remain = Math.floor((11000 - (Date.now() - tStartQuiz)) / 1000);
        if( remain <= 0 ) remain = 0;
        $('time').text(remain);
    }, 100);
}

function onQuizRet(_data) {
    console.log(_data);
    $('.q_q').each(function(idx){
        if( idx == _data.collect_idx ) {
            $(this).css('background-color','blue');
            var collect_rate = (_data.collect_cnt / _data.total_cnt) * 100.0;
            addChat( "", false, 0, '<div class="notice_font">퀴즈 정답</div>', '<b><div style="color:' + color[idx] + '">' + (idx+1) + '번 ( 정답률 : ' + collect_rate + '% )</div></b>', false);
        }
    })

    setTimeout(function() {
        $('.quiz_wnd').css('display', 'none');
    }, 3000);
}

function onEffect(data) {
    if( data.name == 'bbam') {
        animBBam();
    }
}

function registerKeyEvent( socket ) {
    $('.ip_msg').keypress(function(e) {
        var code = (e.which ? e.which : e.keyCode );
        if( code == 13 ) {
            var nick = getNickName();
            var msg = $(this).val();
            if( strip(msg).length > 60 ) {
                alert('메시지는 짧게');
                $(this).val('');
                return;
            }

            if( strip(msg).length <= 0 ) {
                return;
            }

            if( msg[0] == '/' ) {
                $(this).val('');
                if( !isAutoSearchChecked() ) {
                    var query = msg.substr(1);
                    searchWebRoot(socket, query, true);
                }
                else {
                    showAdminMsg('반자동 검색을 해제 한 후에 검색을 사용할 수 있습니다');
                }
                $(this).blur();
                return;
            }

            var isvote = -1;
            if( msg.search(/111+/g) != -1 || msg == "1") {
                vote(socket, {idx:0});
                isvote = 0;
            }
            else if( msg.search(/222+/g) != -1 || msg == "2" ) {
                vote(socket, {idx:1});
                isvote = 1;
            }
            else if( msg.search(/333+/g) != -1 || msg == "3") {
                vote(socket, {idx:2});
                isvote = 2;
            }

            if( isvote != -1 ) {
                $(this).val('');
                return;
            }

            nick = nick.substr(0,14);
            socket.emit('chat', {nickname: nick, msg: msg, isvote: isvote });
            $(this).val('');
        }
    })

    $(document).keydown(function(e) {
        if( $('.ip_name').is(':focus') ) return;
        if( $('.ip_msg').is(':focus') ) return;

        var code = (e.which ? e.which : e.keyCode );

        if( (code >= 97 && code <= 99) ) {
            var curTime = new Date();
            if( curTime - tClick < 100 ) {
                return;
            }
            tClick = curTime;

            var idx = code - 97;

            var nick = getNickName();
            var clicked = (idx+1);
            vote(socket, {idx: idx });
        }
        else if( ( code >= 49 && code <= 51 ) ) {
            var curTime = new Date();
            if( curTime - tClick < 100 ) {
                return;
            }
            tClick = curTime;

            var idx = code - 49;

            var nick = getNickName();
            var clicked = (idx+1);
            vote(socket, {idx: idx });
        }
        else {
            if( code != 27 ) {
                $('.ip_msg').val('');
                $('.ip_msg').focus();
                bTrigger = true;
            }
        }
    })

    $('.ip_msg').keyup(function(e) {
        var msg = $(this).val();
        var code = (e.which ? e.which : e.keyCode );
        if( bTrigger ) {
            bTrigger = false;
            if( $(this).val() != '/' && $(this).val() != '#')
                $(this).val('');
            return;
        }

        var isvote = -1;
        if( msg.search(/111+/g) != -1 ) {
            vote(socket, {idx:0});
            isvote = 0;
        }
        else if( msg.search(/222+/g) != -1  ) {
            vote(socket, {idx:1});
            isvote = 1;
        }
        else if( msg.search(/333+/g) != -1 ) {
            vote(socket, {idx:2});
            isvote = 2;
        }

        if( isvote != -1 ) {
            $(this).val('');
        }

        if( code == 27 ) {
            $(this).blur();
        }
    })

    $('.btn_vote').each(function(idx) {
        $(this).click(function() {
            var idx = $(this).attr('data');
            vote(socket, {idx:idx});
        });
    })
}

function addChat( mode, isbaned, hash , name, msg, bStrip,auth ) {
    var li = '<li class="chat_item" mode="' + mode + '" >' +
        '<div class="chat_msg_obj">' +
        (( auth >= 1 ) ? '<div class="chat_star"><img src="/images/star.png" style="width:12px;height:12px;margin-top:8px;"/></div>' : '') +
        '<div class="chat_name '+ (isbaned ? 'baned' : '') +'" hash=' + hash + '>' +
        (bStrip ? strip(name) : name) +
        '</div>' +
        '<div class="chat_text">' +
        (bStrip ? strip(msg) : msg) +
        '</div>' +
        '</div>' +
        '</li>';

    var bAutoMoveToBottom = false;
    var chatwndheight = $('.chat_msg').height();

    if( ($('.chat_msg').get(0).scrollTop == ($('.chat_msg').get(0).scrollHeight - chatwndheight) ) ||
        $('#cb_auto_scroll').is(':checked')) {
        bAutoMoveToBottom = true;
    }

    if(isMobile()) {
        bAutoMoveToBottom = true;
    }

    $('.chat_ul').append(li);

    //  끝 정렬
    if( bAutoMoveToBottom )
        $('.chat_msg').scrollTop($('.chat_msg').get(0).scrollHeight);

}

function addBannerAds() {

}

function searchWebRoot( socket, query, isBroadcast ) {
    //$('.search_article').html('');
    $('#sd_ret').html('');
    $('#sd_ret').css('display','inline-block');
    $('#sd_ads').css('display','none');
    $('.image_search_wnd').html('');
    $('.image_search_wnd').css('display', 'inline-block');
    $('#mid_quiz_search').html('');
    var nick = getNickName();
    socket.emit('search', {nickname: nick, msg: query, isBroadcast : isBroadcast });
    var searched = false;
    if( $('#cb_s0').is(':checked')) {
        searchWeb(0, query);
        searched = true;
    } //  백과사전
    if( $('#cb_s1').is(':checked')) {
        searchWeb(1, query);
        searched = true;
    } //  지시인
    if( $('#cb_s2').is(':checked')) {
        searchWeb(2, query);
        searched = true;
    } //  블로그
    if( $('#cb_s3').is(':checked')) {
        searchWeb(3, query);
        searched = true;
    } //  뉴스
    if( $('#cb_s4').is(':checked')) {
        searchWeb(4, query);
        searched = true;
    } //  이미지

    if( $('#cb_s5').is(':checked')) {
        searchWebGoogle(query);
        searched = true;
    } //  구글

    if( $('#cb_s6').is(':checked')) {
        $('#mid_quiz_search').css('display','inline-block');
        searchFromDB(query);
        searched = true;
    }

    if( !searched ) {
        //$('.search_article').html(htmlBackup);
        $('#sd_ret').css('display','none');
        $('#sd_ads').css('display','inline-block');
    }
}

function searchWeb( type, query ) {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            query : query,
            type: type
        }),
        contentType: 'application/json',
        url: '/searchex',
        success: function(data) {
            if( type != 4 ) {
                setSearchRet(data, false);
            }
            else {
                setSearchRetImage(data, true);
            }
        }
    });
}

function searchFromDB( query ) {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            query : query
        }),
        contentType: 'application/json',
        url: '/searchdb',
        success: function(data) {
            setSearchDB(data);
        }
    });
}

function searchWebGoogle( query ) {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            query : query
        }),
        contentType: 'application/json',
        url: '/searchgoogle',
        success: function(data) {
            setSearchRet(data, true);
        }
    });
}

function logout_test() {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
        }),
        contentType: 'application/json',
        url: '/logout',
        success: function(data) {
            window.location.href = unescape(window.location.pathname);
        }
    });
}

jQuery.fn.appendAt = function( content, index ) {
    this.each(function(i, item) {
        var $content = $(content).clone();
        if ( index === 0 ) {
            $(item).prepend($content);
        } else {
            $content.insertAfter($(item).children().eq(index-1));
        }
    });
    $(content).remove();
    return this;
};

jQuery.fn.appendAtRandom = function( content ) {
    this.each(function(i, item) {
        var max = $(item).children().length,
            pos = Math.floor( Math.random() * (max+1) );
        $(item).appendAt(content, pos);
    });
    return this;
};

function setSearchRet(items, first) {
    var html = '';
    for( var i = 0 ; i < items.length ; ++i) {
        var item = items[i];
        var image = '<img src="'+ item.thumbnail + '"/>';
        var div = '<div class="search_ret_root">' +
            '<div class="search_ret_title">' +
            item.title +
            '</div><div class="search_ret_desc">' +
            (item.description) +
            '</div>' +
            '</div>';

        html += div;
    }

    if( items.length == 0 ) {
        html = '<div style="text-align:center;">검색 결과가 없습니다. 좀 더 신중한 검색!</div>';
    }
    if( first ) {
        $('#sd_ret').prepend(html);
    }
    else {
        $('#sd_ret').append(html);
    }
    clearTimeout(timerID);
    timerID = setTimeout(function() {
        //$('.search_article').html(htmlBackup);
        $('#sd_ret').css('display','none');
        $('#sd_ads').css('display','inline-block');
    }, 15000);
}

function setSearchRetImage(items, first) {
    var html = '';
    var div = '<div class="search_ret_root"><div class="search_ret_desc">';
    for( var i = 0 ; i < items.length ; ++i) {
        var item = items[i];
        var image = '<img class="img_search" src="'+ item.thumbnail + '"/>';
        div += image;
    }
    div += '</div></div>';
    html = div;

    if( items.length == 0 ) {
        html = '<div style="text-align:center;">검색 결과가 없습니다. 좀 더 신중한 검색!</div>';
    }

    $('.image_search_wnd').html(html);

    clearTimeout(timerIDForImageSearch);
    timerIDForImageSearch = setTimeout(function() {
        //$('.search_article').html(htmlBackup);
        $('.image_search_wnd').css('display','none');
    }, 15000);
}

function setSearchDB(data) {
    var items = data.quizdatalist;
    var queries = data.queries;

    items.sort( function(item1, item2) {
        var cnt1 = 0, cnt2 = 0;
        for( var i = 0 ; i < queries.length ; ++i) {
            queries[i] = queries[i].replace('%', '');
            queries[i] = queries[i].replace('%', '');
            console.log(queries[i]);
            if( item1.question.indexOf(queries[i]) != -1 ) {
                cnt1++;
            }
            if( item2.question.indexOf(queries[i]) != -1 ) {
                cnt2++;
            }

            for( var j = 0 ; j < 3 ; ++j) {
                if( item1.answer[j].indexOf(queries[i]) != -1 ) {
                    cnt1++;
                }

                if( item2.answer[j].indexOf(queries[i]) != -1 ) {
                    cnt2++;
                }
            }
        }

        console.log(cnt1 + ' , ' + cnt2);
        return cnt2 - cnt1;
    });

    var html = '';
    var htmlforleft = '';
    var cnt = 0;
    for( var i = 0 ; i < items.length ; ++i, ++cnt) {
        var item = items[i];
        var sub = '';
        for( var j = 0 ; j < 3 ; ++j ) {
            if( j != item.collect ) {
                sub += (j+1) + '. ' + item.answer[j] + ' ';
            }
            else {
                sub += '<b>' + (j+1) + '. ' + item.answer[j] + '</b> ';
            }
        }
        var div = '<div class="search_ret_root">' +
            '<div class="search_ret_title">' +
            item.question +
            '</div><div class="search_ret_desc">' +
            (sub) +
            '</div>' +
            '</div>';

        html += div;
        if( cnt < 1 )
            htmlforleft += div;
    }

    if( items.length == 0 ) {
        html = '<div style="text-align:center;">검색 결과가 없습니다. 좀 더 신중한 검색!</div>';
    }

    $('#mid_quiz_search').prepend(html);
    $('#sd_ret').prepend(htmlforleft);

    clearTimeout(timerIDForDB);
    timerIDForDB = setTimeout(function() {
        //$('.search_article').html(htmlBackup);
        $('#mid_quiz_search').css('display','none');
        $('#sd_ret').css('display','none');
        $('#sd_ads').css('display','inline-block');
    }, 15000);
}

function getNickName() {
    var nick = strip($('.ip_name').val());
    nick = nick.substr(0,10);
    return nick;
}

function setNickName() {
    var rd = Math.floor(Math.random() * 500);
    $('.ip_name').val('손님' + rd);
}

function vote(socket, data) {
    data.nickname = getNickName();
    socket.emit('vote', data);
}

var animOpacityTimerID = -1;
function showAdminMsg(msg) {
    var obj = $('.admin_msg');
    if( animOpacityTimerID != -1 ) {
        clearTimeout(animOpacityTimerID);
        animOpacityTimerID = -1;
        obj.removeClass('opacity');
        obj.addClass('non_opacity');
    }
    obj.addClass('opacity');
    obj.removeClass('non_opacity');
    $('.admin_msg').html(msg);
    $('.admin_msg').css('opacity', '0.85');
    animOpacityTimerID = setTimeout(function() {
        $('.admin_msg').css('opacity', '0');
    }, 7000);

}

function isAutoSearchChecked() {
    if($('.cb_auto_search').is(':checked')) {
        return true;
    }

    return false;
}

function isMaxVoteDuplicateChecked() {
    if($('.cb_max_vote_duplicate').is(':checked')) {
        return true;
    }

    return false;
}

function setVoteMsgVisibleListener() {
    var checked = localStorage.getItem('cb_votemsg') || 0;
    $('#cb_votemsg').attr('checked', checked == 1 ? true : false );

    $('#cb_votemsg').change(function() {
        if( $(this).is(':checked') ) {
            setMsgVisible('vote', false);
            localStorage.setItem('cb_votemsg', 1);

        }
        else {
            setMsgVisible('vote', true);
            localStorage.setItem('cb_votemsg', 0);
        }
    });
}

function setMsgVisible(mode, isVisible) {
    $('.chat_item').each(function(idx) {
        if( $(this).attr('mode') == mode) {
            $(this).css('display', isVisible ? 'block' : 'none');
        }
    })
}

function setMinVoteSliderListener() {
    var min_vote_val = localStorage.getItem('min_vote') || 0;
    $('.min_vote_slider').slider({
        range: "min",
        value: 0,
        min: 0,
        max: 10,
        slide: function( event, ui ) {
            localStorage.setItem('min_vote', ui.value);
            $( "min_vote" ).text( ui.value );
        }
    });

    $('.min_vote_slider').slider('value', min_vote_val);
    $( "min_vote" ).text( min_vote_val );

    var max_vote_dupl = localStorage.getItem('max_vote_dupl') || 0;
    $('.cb_max_vote_duplicate').attr('checked', max_vote_dupl == 1 ? true : false );
    $('.cb_max_vote_duplicate').change(function() {
        if( $(this).is(':checked') ) {
            localStorage.setItem('max_vote_dupl', 1);
        }
        else {
            localStorage.setItem('max_vote_dupl', 0);
        }
    })
}

var bbamTimeoutId = -1;
var bbamIdx = 0;
var bbam_fonts = [];

function initBBam() {
    clearTimeout( bbamTimeoutId );
    $('.bbam').css('display', 'none');
    $('.font_bbam1').css('display', 'none');
    $('.font_bbam2').css('display', 'none');
    $('.font_bbam3').css('display', 'none');

    bbam_fonts = [$('.font_bbam1'), $('.font_bbam2'), $('.font_bbam3')];

    bbamTimeoutId = -1;
    bbamIdx = 0;
}

function animBBam() {
    if( bbamTimeoutId != -1) {
        return;
    }
    $('.bbam').css('display', 'inline-block');
    bbamTimeoutId = setTimeout(showBBamFont, 900);
}

function showBBamFont() {
    bbam_fonts[bbamIdx].css('display', 'inline-block');
    bbamIdx++;
    if( bbam_fonts.length > bbamIdx) {
        bbamTimeoutId = setTimeout(showBBamFont, 900);
    }
    else {
        $('.bbam').effect('shake');
        bbamTimeoutId = setTimeout(initBBam, 3000);
    }
}