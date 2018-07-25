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
    setVisible($('#btn-admin'), false);
    closeUserMenu();
    $('#search-ret-rank-list').empty();
}

function registerKeyEvent( socket ) {
    $('.ip-msg').keypress(onInputMsgKeyPress);
    $(document).keydown(onGlobalKeyDown);
    $('.ip-msg').keyup(onInputMsgKeyUp);
}

function openUserMenu( name, sockid ) {
    var user_menu = $('.user-menu');
    user_menu.attr('sockid', sockid);
    user_menu.find('name').text(name);
    setVisible(user_menu, true);
}

function closeUserMenu() {
    var user_menu = $('.user-menu');
    setVisible(user_menu, false);
}

function registerSocketEvent() {
    socket.on('chat', onChat );
    socket.on('serv_msg', onServMsg);
    socket.on('quiz', onQuiz);
    socket.on('quizret', onQuizRet);
    socket.on('emoticon', onEmoticon);
    socket.on('memo', function(data) {
        $('div[type="memo"]').html(data.memo);
    })
}

function onChat(data) {
    if( data.mode == "vote" ) {
        if( data.isLogin ) {
            data.nickname = '<div class="logined_font">' + data.nickname + '</div>';
        }

        if( isShowMemberVoteOnly() &&
            ( (typeof data.auth == 'undefined') || (data.auth < 0 ) )
        ) {
            addChat( data.mode, data.isBaned, data.nickname, '<b>투표했습니다.</b>', false, data.auth, data.ip, data.sockid );
        }
        else {
            addChat( data.mode, data.isBaned, data.nickname, '<b style="color: '+ color[data.vote] + '">' + data.msg + '</b>', false, data.auth, data.ip, data.sockid);
        }
        setMsgVisible( data.mode, $('#cb_votemsg').is(':checked') ? false : true );
    }
    else if( data.mode == "search") {

        if( data.isLogin ) {
            data.nickname = '<div class="logined_font">' + data.nickname + '</div>';
        }
        addChat( data.mode, data.isBaned, data.nickname, '<b style="color: #1b3440">' + data.msg + '</b>', false, data.auth, data.ip, data.sockid);
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
        addChat( data.mode, data.isBaned, '<notice-nick>알림</notice-nick>', '<notice-nick>' + data.msg + '</notice-nick>', false, data.auth, data.ip, data.sockid);
    }
    else if ( data.mode == "ban") {
        addChat( data.mode, data.isBaned, data.nickname, '<b>' + data.msg + '</b>', false, data.auth, data.ip, data.sockid);
    }
    else {

        if( data.admin ) {
            addChat( data.mode, data.isBaned, '<div class="admin-nick">' + data.nickname + '</div>', '<div class="admin-nick">' + data.msg + '</div>', false, data.auth, data.ip, data.sockid);
        }
        else if( data.isLogin ) {
            addChat( data.mode, data.isBaned, '<div class="logined_font">' + data.nickname + '</div>', data.msg, false, data.auth, data.ip, data.sockid);
        }
        else {
            addChat( data.mode, data.isBaned, data.nickname, data.msg, true, data.auth, data.ip, data.sockid );
        }

    }
}

var tStartQuiz = 0;
var idInterval = -1;
var idTimeout = -1;
var quizdata = null;
function onQuiz(data) {
    console.log('onQuiz : ' + data );
    $('.q_q').each(function(idx){
        $(this).css('background-color','transparent');
    })
    $('.quiz_wnd').css('display', 'inline-block');
    quizdata = data.quizdata;
    $('.q_title').text(data.quizdata.question);
    var html = '';
    $('.q_q').each(function(idx) {
        var t = (idx+1) + '. ' + data.quizdata.answer[idx];
        html += (t + '</br>');
        $(this).text(t);
    })

    addChat( "", false, '<div class="notice_font">퀴즈</div>', data.quizdata.question + '</br>' + html, false);

    tStartQuiz = new Date();

    clearInterval(idInterval);
    idInterval = setInterval(function() {
        var remain = Math.floor((11000 - (Date.now() - tStartQuiz)) / 1000);
        if( remain <= 0 ) remain = 0;
        $('time').text(remain);
    }, 100);
}

function onQuizRet(_data) {
    if( !quizdata ) return;
    console.log('onQuizRet : ' + _data);
    $('.q_q').each(function(idx){
        if( idx == _data.collect_idx ) {
            $(this).css('background-color','blue');
            var collect_rate = (_data.collect_cnt / _data.total_cnt) * 100.0;
            addChat( "", false, '<div class="notice_font">퀴즈 정답</div>', '<b><div style="color:' + color[idx] + '">' + (idx+1) + '번 '+ quizdata.answer[idx]  + ' ( 정답률 : ' + collect_rate + '% )</div></b>', false);
        }
    })

    setTimeout(function() {
        $('.quiz_wnd').css('display', 'none');
    }, 3000);
}

function onEmoticon(_data) {
    switch( _data.name ) {
        case "bbam":
            addChat( "", false, _data.nick, '<img style="width:60px; height:60px;" src="/images/hong_shock.png"/>', false);
            break;
    }
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

        if( msg == '@memo') {
            var memo = $('.memo-area').val();

            memo = memo.replace(/(?:\r\n|\r|\n)/g, '<br />');
            socket.emit('memo', {memo: memo });
            //$('div[type="memo"]').html(memo);
            $(this).val('');
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
        return;
    }

    var isvote = -1;
    /*
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
*/
    if( isvote != -1 ) {
        $(this).val('');
    }

    if( code == 27 ) {
        $(this).blur();
    }
}

var reserved_key = '';
function onGlobalKeyDown(e) {
    if( $('.ip-name').is(':focus') ) return;
    if( $('.ip-msg').is(':focus') ) return;
    if( $('.memo-area').is(':focus')) return;

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
    else if( code == 37 || code == 40 || code == 39 ) {
        var idx = -1;
        if( code == 37 ) idx = 0;
        if( code == 40 ) idx = 1;
        if( code == 39 ) idx = 2;
        vote(socket, {idx: idx });
    }
    else if( code >= 49 && code <= 53 ) {
        var idx = code - 49;
        if( searchtop5queries.length <= idx ) {
            return;
        }

        searchWebRoot(socket, searchtop5queries[idx], false);
    }
    else {
        if( code != 27 ) {
            reserved_key = code;
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

function setNickName( nick ) {
    $('.ip-name').val(nick);
}

function setSocketListener() {
    socket.on('vote_data', onProcessVoteData);
    socket.on('myid', function(data) {
        myid = data.socket;
        isLogin = data.isLogined;
        setVisible($('#btn-admin'), data.auth >= 50);
        setVisible($('.admin-component'), data.auth >= 50);
        $('#btn-admin').setEnable(data.auth >= 50);
        setNickName( data.nick );
        setShowMemberVoteOnlyListener();
        setAnalysisBtns(data.analstep);
    });
}

var slhash = '';
var searchtop5queries = [];
function onSearchRetRank( datalist, hash ) {
    var searchRetRankList = $('#search-ret-rank-list');

    var checked = localStorage.getItem('cb_searchTopFive') || 0;

    if( datalist.length <= 0 || checked == 0) {
        searchRetRankList.empty();
        searchtop5queries = [];
        slhash = '';
        setVisible($('div[type="search-ret-rank"]'), false );
        return;
    }
    else {
        setVisible($('div[type="search-ret-rank"]'), true );
    }

    if( hash != slhash ) {
        searchRetRankList.empty();
        searchtop5queries = [];
        for( var i = 0 ; i < datalist.length ; ++i ) {
            var html = '<li class="btn-search-ret-rank">' + datalist[i].query + '</li>';
            searchRetRankList.append(html);
            searchtop5queries.push(datalist[i].query);
        }

        slhash = hash;
    }
}

function setBtnListener() {
    $('wnd[role="settings"]').css('display', 'none');
    $('#btn-settings').click(onBtnSettings);
    $('#btn-help').click(onBtnHelp);
    $('#btn-admin').click(onBtnAdmin);

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

    $('#btn-popup-close').click(function(e) {
        setVisible($('.popup_wnd'), false);
    })

    $('#um-ban').click(function(e) {
        var user_menu = $('.user-menu');
        closeUserMenu();
        socket.emit('ban', {sockid: user_menu.attr('sockid')});
    });

    $('#um-permanentban').click(function(e) {
        var user_menu = $('.user-menu');
        closeUserMenu();
        socket.emit('permanentban', {sockid: user_menu.attr('sockid')});
    });

    $('#um-like').click(function(e) {
        var user_menu = $('.user-menu');
        closeUserMenu();
        console.log('like');
        socket.emit('like', {sockid: user_menu.attr('sockid')});
    })

    $('#um-cancel').click(function(e) { closeUserMenu() } );

    $(document).on('click', '.chat_item div[type="nick"]', function (e) {
        openUserMenu($(this).text(), $(this).attr('sockid') );
        /*
        var name = $(this).text();
        if( confirm('신고가 모이면 이 아이피는 당분간 투표에 참여할 수 없습니다."' + name + '"를 신고하시겠습니까? ') ) {
            socket.emit('ban', {sockid: $(this).attr('sockid')});
        }
        */
        e.preventDefault();
    });

    $(document).on('mouseover', '.chat_item div[type="nick"]', function (e) {
        $(this).css('background-color', 'yellow');
        e.preventDefault();
    });

    $(document).on('mouseout', '.chat_item div[type="nick"]', function (e) {
        $(this).css('background-color', 'white');
        e.preventDefault();
    });

    $(document).on('click', '.btn-search-ret-rank', function(e) {
        searchWebRoot(socket, $(this).text(), false);
    });

    $(document).on('mouseover', '.btn-search-ret-rank', function (e) {
        $(this).css('background-color', 'yellow');
        $(this).css('color', 'blue');
        e.preventDefault();
    });

    $(document).on('mouseout', '.btn-search-ret-rank', function (e) {
        $(this).css('background-color', 'transparent');
        $(this).css('color', 'white');
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
    onSearchRetRank(data.searchlist, data.slhash);
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

function onBtnAdmin(e) {
    e.stopPropagation();
    var helpWnd = $('wnd[role="analysis"]');
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
        case 2:
            return "/images/star2.png";
        case 3:
            return "/images/star3.png";
        case 4:
            return "/images/star4.png";
        case 50:
            return "/images/admin.png";
        case 99:
            return "/images/noti.png";
        default:
            return "/images/guest.png";
    }

    return "";
}

function addChat( mode, isbaned , name, msg, bStrip,auth, ip, sockid ) {
    var li =    '<li class="chat_item" mode="' + mode +'">' +
                '<div type="msg-obj">' +
                '<div type="nick" ip="'+ ip +'" sockid="' + sockid + '"><img type="grade" src="' + getGradeImage(auth, isbaned) +'"/><div type="nick-only">' + name +'</div><div type="ip-only">' + (ip ? ('(' + ip + ')') : '') + '</div></div>' +
                '<div type="msg">' + ( bStrip ? strip(msg) : msg ) + '</div>' +
                '<data class="chat_name"></data>' +
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

    var queries = query.trim().split(' ');
    var chinese = false;
    var chienseQuery = '';
    for( var i = 0 ; i < queries.length ; ++i ) {
        if( queries[i] === "한자" ) {
            chienseQuery = query.slice(0,query.indexOf(queries[i]));
            chinese = true;
            break;
        }
    }

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
        searchWebGoogle(query, false);
        searched = true;
    } //  구글

    if( chinese ) {
        searchWebNaver(chienseQuery, false);
    }


    if( $('#cb_s6').is(':checked')) {
        //$('#mid_quiz_search').css('display','inline-block');
        searchFromDB(query);
        searched = true;
    }

    if( $('#cb_s7').is(':checked')) {
        //$('#mid_quiz_search').css('display','inline-block');
        //  국어
        query = query.trim();
        var aQueries = query.split(' ');
        for( var i = 0 ; i < aQueries.length ; ++i ) {
            searchWebGoogle(aQueries[i], true);
        }
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

function searchWebGoogle( query, grammer) {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            query : query,
            grammer : grammer
        }),
        contentType: 'application/json',
        url: '/searchgoogle',
        success: function(data) {
            setSearchRet(data, true, 2);
        }
    });
}

function searchWebNaver( query ) {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            query : query,
        }),
        contentType: 'application/json',
        url: '/searchnaver',
        success: function(data) {
            setSearchRet(data, true, 1);
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

var timerIDForDB = 0;
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

    getSearchArea(1).prepend(html);

    clearTimeout(timerID);
    timerID = setTimeout(function() {
        //$('.search_article').html(htmlBackup);
        restoreSearch();
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
    var cbs_name = ['cb0', 'cb1', 'cb2', 'cb3', 'cb4', 'cb5', 'cb6', 'cb7'];
    var cbs = [$('#cb_s0'), $('#cb_s1'), $('#cb_s2'), $('#cb_s3'), $('#cb_s4'), $('#cb_s5'), $('#cb_s6'), $('#cb_s7')];
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

function setSearchTopFiveListener() {
    var checked = localStorage.getItem('cb_searchTopFive') || 0;
    $('#cb_top_five').attr('checked', checked == 1 ? true : false );

    $('#cb_top_five').change(function() {
        if( $(this).is(':checked') ) {
            onSearchRetRank([], '');
            localStorage.setItem('cb_searchTopFive', 1);

        }
        else {
            onSearchRetRank([], '');
            localStorage.setItem('cb_searchTopFive', 0);
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

jQuery.fn.extend({
    setEnable: function(bEnable) {
        this.attr('disabled', !bEnable);
    }
});

var btnAnalStart = $('#anal-start');
var btnAnalEnd = $('#anal-end');
var btnQuizStart = $('#anal-quiz-start');
var btnQuizEnd = $('#anal-quiz-end');

function initAnalysis() {
    initAdminSocketListener();
    initAnalysisBtns();

    btnAnalStart.click(onAnalStart);
    btnQuizStart.click(onQuizStart);
    btnQuizEnd.click(onQuizEnd);
    btnAnalEnd.click(onAnalEnd);
}

function onAnalStart(e) {
    $(this).setEnable(false);
    socket.emit('analysis', {step: 'a-start'});
}

function onQuizStart(e) {
    $(this).setEnable(false);
    socket.emit('analysis', {step: 'q-start'});
}

function onQuizEnd(e) {
    $(this).setEnable(false);
    var idx = $('input[name=quiz_answer]:checked').attr('value');
    socket.emit('analysis', {step: 'q-end', idx: Number(idx)});
}

function onAnalEnd(e) {
    $(this).setEnable(false);
    socket.emit('analysis', {step: 'a-end'});
}

function initAnalysisBtns() {
    btnAnalStart.setEnable(true);
    btnAnalEnd.setEnable(false);
    btnQuizStart.setEnable(false);
    btnQuizEnd.setEnable(false);
}

function setAnalysisBtns(step) {
    switch(step) {
        case 0:
            initAnalysisBtns();
            break;

        case 1:
            //  분석 시작 상태
            btnAnalStart.setEnable(false);
            btnQuizStart.setEnable(true);
            btnQuizEnd.setEnable(false);
            btnAnalEnd.setEnable(true);
            break;

        case 2:
            //  퀴즈 시작 상태
            btnAnalStart.setEnable(false);
            btnQuizStart.setEnable(false);
            btnQuizEnd.setEnable(true);
            btnAnalEnd.setEnable(false);
            break;

        case 3:
            //  퀴즈 종료 상태
            btnAnalStart.setEnable(false);
            btnQuizStart.setEnable(true);
            btnQuizEnd.setEnable(false);
            btnAnalEnd.setEnable(false);
            break;
    }
}

function initAdminSocketListener() {
    socket.on('analysis', function(data) {
        if( data.ret != 0 ) {
            initAnalysisBtns();
            showAdminMsg('통계 집계 순서에 오류가 있습니다');
            return;
        }
        switch(data.step) {
            case 'a-start':
            {
                if( data.ret == 0 ) {
                    btnAnalEnd.setEnable(true);
                    btnQuizStart.setEnable(true);
                    btnQuizEnd.setEnable(false);
                    addChat( "", false, '<div class="notice_font">시스템</div>', '<b style="color:red;">[Beta] 유저 통계를 시작합니다 ( 새로고침 시에 통계 자료가 날아갑니다 )</b>', false);
                }
                break;
            }

            case 'q-start':
            {
                if( data.ret == 0 ) {
                    btnQuizEnd.setEnable(true);
                    btnAnalEnd.setEnable(false);
                    addChat( "", false, '<div class="notice_font">시스템</div>', '<b style="color:red;">[Beta] 퀴즈 투표 통계 집계 시작</b>', false);
                }
                break;
            }

            case 'q-end':
            {
                if( data.ret == 0 ) {
                    btnQuizStart.setEnable(true);
                    btnAnalEnd.setEnable(true);
                    addChat( "", false, '<div class="notice_font">시스템</div>', '<b style="color:red;">[Beta] 퀴즈 투표 통계 집계 종료</b>', false);
                }
                break;
            }

            case 'a-end':
            {
                if( data.ret == 0 ) {
                    console.log(data.list);
                    btnAnalStart.setEnable(true);
                    btnQuizStart.setEnable(false);
                    btnQuizEnd.setEnable(false);
                    var html = '';
                    for(var i = 0 ; i < data.list.length ; ++i) {
                        html += (i + 1) + '위 : ' + data.list[i].nick + ' / ' + data.list[i].collect + '</br>';
                    }
                    addChat( "", false, '<div class="notice_font">시스템</div>', '<b style="color:red;">[Beta] 유저 통계를 종료합니다</b></br>' + html, false);
                }
                break;
            }
        }
    })
}