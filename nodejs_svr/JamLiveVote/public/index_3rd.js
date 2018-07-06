/**
 * Created by nnnyy on 2018-07-06.
 */
var socket = io();
var bTrigger = false;
var tClick = 0;
var isLogin = false;
var timerID = -1;
var timerIDForImageSearch = -1;

function setVisible(elem, visible) {
    elem.css('display', visible ? 'inline-block' : 'none');
}

function init() {
    setVisible($('#search-area-1'), false);
    setVisible($('#ads-area-1'), true);
    setVisible($('#search-area-2'), false);
    setVisible($('#ads-area-2'), true);
    setVisible($('.quiz_wnd') , false);
}

function registerKeyEvent( socket ) {
    $('.ip-msg').keypress(onInputMsgKeyPress);
    $(document).keydown(onGlobalKeyDown);
    $('.ip-msg').keyup(onInputMsgKeyUp);

    /*
    $('.btn_vote').each(function(idx) {
        $(this).click(function() {
            var idx = $(this).attr('data');
            vote(socket, {idx:idx});
        });
    })
    */
}

function registerClickEvent( socket ) {
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

function registerSocketEvent() {
    socket.on('chat', onChat );
    socket.on('serv_msg', onServMsg);
    socket.on('quiz', onQuiz);
    socket.on('quizret', onQuizRet);
}

function onChat(data) {
    if( data.mode == "vote" ) {
        if( data.admin ) {
            data.nickname = '<div class="admin_font">사이트관리자</div>';
        }
        else if( data.isLogin ) {
            data.nickname = '<div class="logined_font">' + data.nickname + '</div>';
        }

        if( isShowMemberVoteOnly() &&
            ( (typeof data.auth == 'undefined') || (data.auth < 0 ) )
        ) {
            addChat( data.mode, data.isBaned, data.hash, data.nickname, '<b>투표했습니다.</b>', false, data.auth, data.ip);
        }
        else {
            addChat( data.mode, data.isBaned, data.hash, data.nickname, '<b style="color: '+ color[data.vote] + '">' + data.msg + '</b>', false, data.auth, data.ip);
        }
        setMsgVisible( data.mode, $('#cb_votemsg').is(':checked') ? false : true );
    }
    else if( data.mode == "search") {
        if( data.admin ) {
            data.nickname = '<div class="admin_font">사이트관리자</div>';
        }
        else if( data.isLogin ) {
            data.nickname = '<div class="logined_font">' + data.nickname + '</div>';
        }
        addChat( data.mode, data.isBaned, data.hash, data.nickname, '<b style="color: #1b3440">' + data.msg + '</b>', false, data.auth, data.ip);
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
        addChat( data.mode, data.isBaned, data.hash, '<notice-nick>알림</notice-nick>', '<notice-nick>' + data.msg + '</notice-nick>', false, data.auth, data.ip);
    }
    else {

        if( data.admin ) {
            addChat( data.mode, data.isBaned, data.hash, '<div class="admin_font">사이트관리자</div>', data.msg, false, data.auth, data.ip);
        }
        else if( data.isLogin ) {
            addChat( data.mode, data.isBaned, data.hash, '<div class="logined_font">' + data.nickname + '</div>', data.msg, false, data.auth, data.ip);
        }
        else {
            addChat( data.mode, data.isBaned, data.hash, data.nickname, data.msg, true, data.auth, data.ip);
        }

    }
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

function onInputMsgKeyPress(e) {
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
                //showAdminMsg('반자동 검색을 해제 한 후에 검색을 사용할 수 있습니다');
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
}

function onInputMsgKeyUp(e) {
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
}

function onGlobalKeyDown(e) {
    if( $('.ip-name').is(':focus') ) return;
    if( $('.ip-msg').is(':focus') ) return;

    var code = (e.which ? e.which : e.keyCode );

    if( (code >= 97 && code <= 99) ) {
        var curTime = new Date();
        if( curTime - tClick < 500 ) {
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
        if( curTime - tClick < 500 ) {
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
            $('.ip-msg').val('');
            $('.ip-msg').focus();
            bTrigger = true;
        }
    }
}

function vote(socket, data) {
    data.nickname = getNickName();
    socket.emit('vote', data);
}

function getNickName() {
    var nick = strip($('.ip-name').val());
    nick = nick.substr(0,6);
    return nick;
}

function setNickName() {
    var rd = Math.floor(Math.random() * 500);
    $('.ip-name').val('손님' + rd);
}

function setSocketListener() {
    socket.on('vote_data', onProcessVoteData);
    socket.on('myid', function(data) {
        myid = data.socket;
        isLogin = data.isLogined;
        setShowMemberVoteOnlyListener();
    })
}

function setBtnListener() {
    $('wnd[role="settings"]').css('display', 'none');
    $('#btn-settings').click(onBtnSettings);
    $('#btn-help').click(onBtnHelp);

    $('#btn-login').click(function(e) {
        window.location.href = '/signin';
    });

    $('#btn-signup').click(function(e) {
        window.location.href = '/signup';
    });

    $('#btn-svr1').click(function(e) {
        window.location.href = 'http://jamlive.net';
    });

    $('#btn-svr2').click(function(e) {
        window.location.href = 'http://ch2.jamlive.net';
    });

    $('#btn-logout').click(function(e) {
        logout();
    })

    $('#btn-quiz').click(function(e) {
        window.open('http://quiz.jamlive.net');
    })

    $(document).on('click', '.chat_item div[type="nick"]', function (e) {
        if( $(this).attr('hash') == '') {
            return;
        }

        var name = $(this).text();
        if( confirm('신고가 모이면 이 아이피는 당분간 투표에 참여할 수 없습니다."' + name + '"를 신고하시겠습니까? ') ) {
            socket.emit('ban', {hash: $(this).attr('hash')});
        }
        e.preventDefault();
    });
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

    var ret_cnt_val = localStorage.getItem('ret_cnt') || 3;
    $('.ret_cnt_slider').slider({
        range: "min",
        value: 3,
        min: 2,
        max: 4,
        slide: function( event, ui ) {
            localStorage.setItem('ret_cnt', ui.value);
            $( "ret_cnt" ).text( ui.value );
        }
    });

    $('.ret_cnt_slider').slider('value', ret_cnt_val);
    $( "ret_cnt" ).text( ret_cnt_val );

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

function onProcessVoteData(data) {
    var votedata = data.vote_data;
    var users = votedata.users;
    $('vote_user_cnt').text(users);
    $('vote_except').text(votedata.bans);

    var total = [0,0,0];
    for( var i = 0 ; i < votedata.cnt.length ; ++i ) {
        total[i] += votedata.cnt[i];
    }

    if( !isShowMemberVoteOnly() ) {
        for( var i = 0 ; i < votedata.guest_cnt.length ; ++i ) {
            total[i] += votedata.guest_cnt[i];
        }
    }

    var totalCnt = 0;
    var maxVoteCnt = 0;
    for( var i = 0 ; i < total.length ; ++i ) {
        totalCnt += total[i];
        if( maxVoteCnt <= total[i]) {
            maxVoteCnt = total[i];
        }
    }

    var duplicatedMaxVoteCnt = 0;
    for( var i = 0 ; i < total.length ; ++i ) {
        if( maxVoteCnt == total[i] ) {
            duplicatedMaxVoteCnt++;
        }
    }

    if( isMaxVoteDuplicateChecked() && duplicatedMaxVoteCnt >= 2 ) {
        total = [0,0,0];
    }


    var minVoteVal = Number($('min_vote').text());

    if( totalCnt <= minVoteVal) {
        total = [0,0,0];
    }

    showBarChart('.ct-chart',['1번','2번','3번'],[total], {
        seriesBarDistance: 10,
        height: 180,
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
}

function onServMsg(data) {
    showAdminMsg(data.msg);
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

function onBtnSettings(e) {
    e.stopPropagation();
    var settingsWnd = $('wnd[role="settings"]');
    settingsWnd.css('display','inline-block');

    settingsWnd.click(function(e) {
        e.stopPropagation();
    })

    $(window).click(function() {
        settingsWnd.animate({
            left: "-=300"
        }, 300, function() {
            // Animation complete.
            $(window).unbind('click');
        });
    })

    settingsWnd.animate({
        left: "+=300"
    }, 300, function() {
        // Animation complete.
    });
}

function onBtnHelp(e) {
    e.stopPropagation();
    var helpWnd = $('wnd[role="help"]');
    helpWnd.css('display','inline-block');

    helpWnd.click(function(e) {
        e.stopPropagation();
    })

    $(window).click(function() {
        helpWnd.animate({
            left: "-=300"
        }, 300, function() {
            // Animation complete.
            $(window).unbind('click');
        });
    })

    helpWnd.animate({
        left: "+=300"
    }, 300, function() {
        // Animation complete.
    });
}

function getGradeImage( auth, isbaned ) {
    if( isbaned ) {
        return "/images/bone.png";
    }

    switch(auth){
        case 0:
            return "/images/0star.png";
        case 1:
            return "/images/star.png";
        case 99:
            return "/images/noti.png";
        default:
            return "/images/guest.png";
    }

    return "";
}

function addChat( mode, isbaned, hash , name, msg, bStrip,auth, ip ) {
    var li =    '<li class="chat_item" mode="' + mode +'">' +
                '<div type="msg-obj">' +
                '<div type="nick" hash="'+ hash +'"><img type="grade" src="' + getGradeImage(auth, isbaned) +'"/><div type="nick-only">' + name +'</div><div type="ip-only">' + (ip ? ('(' + ip + ')') : '') + '</div></div>' +
                '<div type="msg">' + ( bStrip ? strip(msg) : msg ) + '</div>' +
                '<data class="chat_name" hash="'+ hash +'"></data>' +
                '</div>' +
                '</li>';

    var bAutoMoveToBottom = false;
    var chatwndheight = $('.chat-ui').height();

    if( $('.chat-ui').find('li').length > 300 ) {
        $('.chat-ui').find('li').eq(0).remove();
    }

    if( ($('.chat-ui').get(0).scrollTop == ($('.chat-ui').get(0).scrollHeight - chatwndheight - 20/* padding */) ) ||
        $('#cb_auto_scroll').is(':checked')) {
        bAutoMoveToBottom = true;
    }

    $('.chat-ui').append(li);

    //  끝 정렬
    if( bAutoMoveToBottom ) {
        $('.chat-ui').scrollTop($('.chat-ui').get(0).scrollHeight);
    }

}

function initSearch() {
    $('#search-area-1').html('');
    $('#search-area-1').css('display','inline-block');
    $('#ads-area-1').css('display','none');
    $('#search-area-2').html('');
    $('#search-area-2').css('display','inline-block');
    $('#ads-area-2').css('display','none');
}

function restoreSearch() {
    $('#search-area-1').css('display','none');
    $('#ads-area-1').css('display','inline-block');
    $('#search-area-2').css('display','none');
    $('#ads-area-2').css('display','inline-block');
}

function searchWebRoot( socket, query, isBroadcast ) {
    initSearch();
    //$('#mid_quiz_search').html('');
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
        //$('#mid_quiz_search').css('display','inline-block');
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
            var where = 1;
            if( type == 0 ) where = 2;

            if( type != 4 ) {
                setSearchRet(data, false, where);
            }
            else {
                setSearchRetImage(data, true, where);
            }
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
            setSearchRet(data, true, 2);
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

function setSearchDB(data) {
    var items = data.quizdatalist;
    var queries = data.queries;

    items.sort( function(item1, item2) {
        var cnt1 = 0, cnt2 = 0;
        var add = 1;
        for( var i = queries.length - 1 ; i >= 0 ; --i) {
            queries[i] = queries[i].replace('%', '');
            queries[i] = queries[i].replace('%', '');
            console.log(queries[i]);
            if( item1.question.toUpperCase().indexOf(queries[i].toUpperCase()) != -1 ) {
                cnt1+= add;
            }
            if( item2.question.toUpperCase().indexOf(queries[i].toUpperCase()) != -1 ) {
                cnt2+= add;
            }

            for( var j = 0 ; j < 3 ; ++j) {
                if( item1.answer[j].toUpperCase().indexOf(queries[i].toUpperCase()) != -1 ) {
                    cnt1+= add;
                }

                if( item2.answer[j].toUpperCase().indexOf(queries[i].toUpperCase()) != -1 ) {
                    cnt2+= add;
                }
            }

            add++;
        }
        return cnt2 - cnt1;
    });

    var ret_cnt_val = localStorage.getItem('ret_cnt') || 3;
    if( items.length > ret_cnt_val) {
        items = items.slice( 0, ret_cnt_val );
    }

    var html = '';
    var htmlforleft = '';
    var cnt = 0;
    for( var i = 0 ; i < items.length ; ++i, ++cnt) {
        var item = items[i];
        var sub = '';
        for( var j = 0 ; j < 3 ; ++j ) {
            if( j != item.collect ) {
                sub += (j+1) + '. ' + item.answer[j].trim() + '<br>';
            }
            else {
                sub += '<b>' + (j+1) + '. ' + item.answer[j].trim() + '</b><br>';
            }
        }
        var div = '<div class="search_ret_root" type="fromDB">' +
            '<div class="search_ret_title">' +
            '[기출문제] ' + item.question +
            '</div><div class="search_ret_desc">' +
            (sub) +
            '</div><div class="separator"></div>' +
            '</div>';

        html += div;
        if( cnt < 2 )
            htmlforleft += div;
    }

    if( items.length == 0 ) {
        htmlforleft = html = '<div style="text-align:center;">검색 결과가 없습니다. 좀 더 신중한 검색!</div>';
    }

    getSearchArea(2).prepend(htmlforleft);

    clearTimeout(timerIDForDB);
    timerIDForDB = setTimeout(function() {
        //$('.search_article').html(htmlBackup);
        restoreSearch();
    }, 13000);
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

function setSearchRet(items, first, where) {
    var ret_cnt_val = localStorage.getItem('ret_cnt') || 3;
    if( items.length > ret_cnt_val) {
        items = items.slice( 0, ret_cnt_val );
    }

    var html = '';
    for( var i = 0 ; i < items.length ; ++i) {
        var item = items[i];
        var div = '<div class="search_ret_root">' +
            '<div class="search_ret_title">' +
            item.title +
            '</div><div class="search_ret_desc">' +
            (item.description) +
            '</div><div class="separator"></div>' +
            '</div>';

        html += div;
    }

    if( items.length == 0 ) {
        html = '<div style="text-align:center;">검색 결과가 없습니다. 좀 더 신중한 검색!</div>';
    }
    if( first ) {
        getSearchArea(where).prepend(html);
    }
    else {
        getSearchArea(where).append(html);
    }
    clearTimeout(timerID);
    timerID = setTimeout(function() {
        restoreSearch();
    }, 13000);
}

function getSearchArea(where) {
    if( where == 1 ) {
        return $('#search-area-1');
    }
    else {
        return $('#search-area-2');
    }
}

function isMaxVoteDuplicateChecked() {
    if($('.cb_max_vote_duplicate').is(':checked')) {
        return true;
    }

    return false;
}

function isShowMemberVoteOnly() {
    if($('.cb_show_member_vote_only').is(':checked')) {
        return true;
    }

    return false;
}

function setShowMemberVoteOnlyListener() {

    if( !isLogin ) {
        $('.cb_show_member_vote_only').attr('checked', false );
        $('.cb_show_member_vote_only').attr('disabled', true);
        return;
    }
    else {
        $('.cb_show_member_vote_only').attr('disabled', false);
    }
    var only = localStorage.getItem('cb_show_member_vote_only') || 0;

    $('.cb_show_member_vote_only').attr('checked', only == 1 ? true : false );

    $('.cb_show_member_vote_only').change(function() {
        if( $(this).is(':checked') ) {
            localStorage.setItem('cb_show_member_vote_only', 1);
        }
        else {
            localStorage.setItem('cb_show_member_vote_only', 0);
        }
    })
}

function setSearchCheckboxes() {
    var cbs_name = ['cb0', 'cb1', 'cb2', 'cb3', 'cb4', 'cb5', 'cb6'];
    var cbs = [$('#cb_s0'), $('#cb_s1'), $('#cb_s2'), $('#cb_s3'), $('#cb_s4'), $('#cb_s5'), $('#cb_s6')];
    var cbs_ret = new Array(cbs_name.length);
    $.each(cbs_name, function(idx, name) {
        cbs_ret[idx] = localStorage.getItem(name) || 1;
    });

    $.each(cbs, function(idx, item) {
        item.attr('checked', cbs_ret[idx] == 1 ? true : false);
        item.change(function() {
            if( $(this).is(':checked') ) {
                localStorage.setItem(cbs_name[idx], 1);
            }
            else {
                localStorage.setItem(cbs_name[idx], 0);
            }
        })
    })
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

function isAutoSearchChecked() {
    if($('.cb_auto_search').is(':checked')) {$
        return true;
    }

    return false;
}

function logout() {
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