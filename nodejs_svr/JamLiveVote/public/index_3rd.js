/**
 * Created by nnnyy on 2018-07-06.
 */
var socket = null;
var bTrigger = false;
var tClick = 0;
var isLogin = false;
var timerID = -1;
var timerIDForImageSearch = -1;

var RETRY_INTERVAL = 4000;
var ConnectStateInfo = function() {
    this.isConnected = false;
    this.timeoutID = -1;
}
var connectStateInfo = new ConnectStateInfo();

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

var ChatValues = function() {
    this.chatUI = $('.chat-ui');
    this.searchRank = $('#search-ret-rank-list');
    this.lastSearchQuery = '';
    //  5개나 2초동안 모으거나 투표 채팅일 경우 플러싱
    this.chatBuffer = [];
    this.bFlushByTimer = false;
    this.searchArea1 = $('#search-area-1');
    this.searchArea2 = $('#search-area-2');
    this.sockid = '';

    this.memoWnd = $('div#hint-wnd');
    this.memoArea = $('div[type="memo"]');
    setVisible(this.memoWnd, false);

    this.cbNoticeDisable = $('#cb-notice-disable');

    this.bQuizEnable = true;

    this.wndSearchUser = $('.wnd-search-user');
    this.usersMap = new Map();
}

ChatValues.prototype.setUpdateChat = function() {
    setInterval(function() {
        chatValueObj.bFlushByTimer = true;
        chatValueObj.FlushChat();
    }, 1000);
}

ChatValues.prototype.FlushChat = function( mode ) {
    var tCur = new Date();
    if( mode == "vote" || chatValueObj.chatBuffer.length >= 3 || chatValueObj.bFlushByTimer  ) {

        var bAutoMoveToBottom = false;
        var chatwndheight = chatValueObj.chatUI.height();

        var list = chatValueObj.chatUI.find('li');

        if( list.length > 50 ) {
            list.eq(0).remove();
        }

        if( (chatValueObj.chatUI.get(0).scrollTop == (chatValueObj.chatUI.get(0).scrollHeight - chatwndheight - 20/* padding */) ) ||
            $('#cb_auto_scroll').is(':checked')) {
            bAutoMoveToBottom = true;
        }

        var html = '';
        for( var i = 0 ; i < chatValueObj.chatBuffer.length ; ++i ) {
            html += chatValueObj.chatBuffer[i];
        }

        chatValueObj.chatUI.append(html);

        //  끝 정렬
        if( bAutoMoveToBottom ) {
            chatValueObj.chatUI.scrollTop(chatValueObj.chatUI.get(0).scrollHeight);
        }

        chatValueObj.chatBuffer = [];
        chatValueObj.bFlushByTimer = false;
    }
}

ChatValues.prototype.updateMemo = function() {
    var memo = '<b>' + this.memoProvider + '님의 힌트 제공</b><br><br>' + this.memo;
    this.memoArea.html(this.memoProvider ? memo : '');
}

var chatValueObj = new ChatValues();

function setVisible(elem, visible) {
    elem.css('display', visible ? 'inline-block' : 'none');
}

function getVisible(elem) {
    if( elem.css('display') === 'none' ) return false;

    return true;
}

function init() {
    socket = io();
    setVisible($('#search-area-1'), false);
    setVisible($('#ads-area-1'), true);
    setVisible($('#search-area-2'), false);
    setVisible($('#ads-area-2'), true);
    setVisible($('.quiz_wnd') , false);
    setVisible($('#btn-admin'), false);
    setVisible($('.popup_wnd'), false);
    closeUserMenu();
    $('#search-ret-rank-list').empty();

    setVisible($('.wnd-func-key'), false);
    setVisible(chatValueObj.wndSearchUser, false);

    chatValueObj.setUpdateChat();
    setEventListener();

    var tCur = new Date();
    localStorage.setItem('refreshtime', tCur.toString());
}

function registerKeyEvent( socket ) {
    $('.ip-msg').keypress(onInputMsgKeyPress);
    $(document).keydown(onGlobalKeyDown);
    $('.ip-msg').keyup(onInputMsgKeyUp);
}

function openUserMenu( name, sockid, nick ) {
    var user_menu = $('.user-menu');
    user_menu.attr('sockid', sockid);
    user_menu.attr('nick', nick);
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
    socket.on('next-quiz', onNextQuiz);
    socket.on('connect', connectStateInfo.Connect );
    socket.on('disconnect', connectStateInfo.Disconnect);
    socket.on('update-user', onUpdateUser);
    socket.on('update-users', onUpdateUsers);
    socket.on('memo', function(data) {
        chatValueObj.memo = data.memo;
        chatValueObj.memoProvider = data.memo_provider;
        chatValueObj.updateMemo();
    })

    socket.on('reconn-server', function(data) {
        if( data.reason == 'baned') {
            alert('이용 자격이 없음이 확인되어 영구밴 당하셨습니다.');
            window.location.href = 'jamlive.net';
        }
        if( !data.logined ) {
            window.location.href = '/signin';
        }
        else {
            window.location.href = 'http://' + data.url;
        }
        return;
    });
}

function setEventListener() {
    $('#ip-search-user-name').keydown(function() {
        $.ajax({
            type: 'POST',
            dataType: 'json',
            data: JSON.stringify({
                query : $(this).val(),
            }),
            contentType: 'application/json',
            url: '/searchuser',
            success: function(data) {
                if( data.data.ret != 0 ) {
                    $('#search-user-ret').text('검색결과가 없습니다.');
                }
                else {
                    $('#search-user-ret').text(data.data.nick + ' 님의 포인트는 ' + data.data.active_point + ' 입니다');
                }
            }
        });
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
        if( !isShowSearchChat() ) return;
        if( data.isLogin ) {
            data.nickname = '<div class="logined_font">' + data.nickname + '</div>';
        }
        addChat( data.mode, data.isBaned, data.nickname, '<b style="color: #1b3440">' + data.msg + '</b>', false, data.auth, data.ip, data.sockid);
    }
    else if ( data.mode == "notice") {
        if( isDisableNoticeShow() ) return;
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
    if( !chatValueObj.bQuizEnable ) return;
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
    if( !chatValueObj.bQuizEnable ) return;

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
            addChat( "", false, _data.nick, '<img style="width:80px; height:80px;" src="/images/hong_shock.png"/>', false, _data.auth);
            break;

        case "ddk":
            addChat( "", false, _data.nick, '<img style="width:80px; height:80px;" src="/images/ddoddoke.png"/>', false, _data.auth);
            break;

        case "yeee":
            addChat( "", false, _data.nick, '<img style="width:80px; height:80px;" src="/images/yeee.png"/>', false, _data.auth);
            break;
    }
}

function onNextQuiz(data) {
    var weekdayname = ['월요일', '화요일','수요일','목요일','금요일','토요일','일요일'];
    var tTime = new Date('1980-01-01T' + data.data.time);
    var tCur = new Date();
    var bToday = false;
    if( data.data.weekday === ( tCur.getDay() - 1 )) {
        bToday = true;
    }

    var qinfo = data.data.name + ' ' + tTime.getHours() + '시 ' + tTime.getMinutes().toString() + '분';
    $('.weekday').text(bToday? '오.늘.' : weekdayname[data.data.weekday]);
    $('.quizinfo').text(qinfo);
}

function updateUserList() {
    var html = '';
    var keys = chatValueObj.usersMap.keys();
    keys.sort();
    for( var i = 0 ; i < keys.length ; ++i ) {
        html += '<li><div class="btn-user-info" nick="'+ keys[i] +'" >'+ keys[i] + '</div></li>';
    }
    $('#conn-users-list').html(html);
}

function onUpdateUser(data) {
    if( data.op == 'add') {
        chatValueObj.usersMap.put(data.nick, 1);
    }
    else {
        chatValueObj.usersMap.remove(data.nick);
    }

    updateUserList();
}

function onUpdateUsers(data) {
    for( var i = 0 ; i < data.list.length ; ++i) {
        chatValueObj.usersMap.put(data.list[i], 1);
    }

    updateUserList();
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

        var mode = "";
        var emoticon = "";
        if( msg == "ㅃㅃㅃ" ) {
            mode = "emoticon";
            emoticon = "bbam";
        }
        else if( msg == "ㄸㄸ") {
            mode = "emoticon";
            emoticon = "ddk";
        }
        else if( msg == "예~") {
            mode = "emoticon";
            emoticon = "yeee";
        }

        if( msg == '@memo') {
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
        socket.emit('chat', {nickname: nick, msg: msg, isvote: isvote, mode: mode, emoticon: emoticon });
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
    var code = (e.which ? e.which : e.keyCode );

    if( $('.ip-name').is(':focus') ) return;
    if( $('.ip-msg').is(':focus') ) return;
    if( $('.memo-area').is(':focus')) return;
    if( $('#ip-search-user-name').is(':focus') ) return;

    // 새로고침
    var tCur = new Date();
    var tRefreshed = new Date(localStorage.getItem('refreshtime'));
    var bCanRefresh = ( tCur - tRefreshed >= 3000 );

    console.log( tCur );
    console.log( tRefreshed );

    if (e.keyCode == 116 && !bCanRefresh) {
        e.keyCode = 2;
        return false;
    } else if ( !bCanRefresh &&
        (e.ctrlKey
        && (e.keyCode == 78 || e.keyCode == 82) )) {
        return false;
    }
    else {
        localStorage.setItem('refreshtime', tCur.toString());
    }

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
        chatValueObj.sockid = data.socket;
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

    var searchRetRankList = chatValueObj.searchRank;

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


        var duplicateMap = new Map();

        var html = getSearchArea(1).html();
        var html2 = getSearchArea(2).html();

        var bChanged = false;
        for( var i = 0 ; i < datalist.length ; ++i ) {
            var words = datalist[i].query.split(' ');
            for( var w = 0 ; w < words.length ; ++w ) {
                if( chatValueObj.lastSearchQuery.indexOf(words[w]) != -1) continue;
                if( duplicateMap.containsKey( words[w]) ) continue;
                html = html.replace(words[w], '<search-top-ret>' + words[w] + '</search-top-ret>');
                html2 = html2.replace(words[w], '<search-top-ret>' + words[w] + '</search-top-ret>');
                duplicateMap.put(words[w], 1);
                bChanged = true;
            }
        }

        if( bChanged ) {
            getSearchArea(1).html(html);
            getSearchArea(2).html(html2);
        }
    }
}

function setBtnListener() {
    $('wnd[role="settings"]').css('display', 'none');
    $('#btn-settings').click(onBtnSettings);
    $('#btn-users').click(onBtnUsers);
    $('#btn-help').click(onBtnHelp);
    $('#btn-admin').click(onBtnAdmin);

    $('#btn-login').click(function(e) {
        window.location.href = '/signin';
    });

    $('#btn-signup').click(function(e) {
        window.location.href = '/signup';
    });

    $('#btn-svr1').click(function(e) {
        window.location.href = 'http://databucket.duckdns.org:4650';
    });

    $('#btn-svr2').click(function(e) {
        window.location.href = 'http://databucket.duckdns.org:5647';
    });

    $('#btn-svr3').click(function(e) {
        window.location.href = 'http://databucket.duckdns.org:6647';
    });

    $('#btn-svr4').click(function(e) {
        window.location.href = 'http://databucket.duckdns.org:7647';
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
        socket.emit('ban', {sockid: user_menu.attr('sockid'), nick: user_menu.attr('nick')});
    });

    $('#um-permanentban').click(function(e) {
        var user_menu = $('.user-menu');
        closeUserMenu();
        socket.emit('permanentban', {sockid: user_menu.attr('sockid'), nick: user_menu.attr('nick')});
    });

    $('#um-like').click(function(e) {
        var user_menu = $('.user-menu');
        closeUserMenu();
        socket.emit('like', {sockid: user_menu.attr('sockid'), nick: user_menu.attr('nick')});
    })

    $('#um-cancel').click(function(e) { closeUserMenu() } );

    $('#open-memo-wnd').click(onBtnOpenMemoWnd);
    $('#btn-show-func').click(onBtnShowFunc);
    $('#btn-no-quiz').click(onBtnNoQuiz);
    $('#btn-search-user').click(onBtnSearchUser);
    $('#btn-close-search-user').click(onBtnCloseSearchUser);
    $('.btn-memo').click(onBtnMemo);
    $('.btn-memo-cancel').click(onBtnMemoCancel);

    $(document).on('click', '.chat_item div[type="nick"]', function (e) {
        openUserMenu($(this).text(), $(this).attr('sockid'), '' );
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

    $(document).on('mouseover', '.btn-user-info', function(e) {
        $(this).css('background-color', 'yellow');
        e.preventDefault();
    })

    $(document).on('mouseout', '.btn-user-info', function(e) {
        $(this).css('background-color', 'white');
        e.preventDefault();
    })

    $('#conn-users-list').on('click', '.btn-user-info', function (e) {
        openUserMenu($(this).text(), '', $(this).attr('nick') );
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

function onBtnUsers(e) {
    e.stopPropagation();
    var usersWnd = $('wnd[role="users"]');
    usersWnd.css('display','inline-block');

    usersWnd.click(function(e) {
        e.stopPropagation();
    })

    $(window).click(function() {
        usersWnd.animate({
            left: "-=300"
        }, 300, function() {
            // Animation complete.
            $(window).unbind('click');
        });
    })

    usersWnd.animate({
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

function onBtnOpenMemoWnd(e) {
    e.stopPropagation();

    $('.memo-area').val(chatValueObj.memo.replace(/<br>/gi,'\n'));

    setVisible(chatValueObj.memoWnd, true);
}

function onBtnShowFunc(e) {
    e.stopPropagation();

    var bVisible = getVisible($('.wnd-func-key'));
    setVisible($('.wnd-func-key'), !bVisible);
}

function onBtnMemo(e) {
    e.stopPropagation();

    var memo = $('.memo-area').val();
    memo = memo.replace(/(?:\r\n|\r|\n)/g, '<br>');
    socket.emit('memo', {memo: memo });

    setVisible(chatValueObj.memoWnd, false);
}

function onBtnMemoCancel(e) {
    e.stopPropagation();

    setVisible(chatValueObj.memoWnd, false);
}

function onBtnNoQuiz(e) {
    e.stopPropagation();

    setVisible($('.quiz_wnd'), false);
    clearInterval(idInterval);

    chatValueObj.bQuizEnable = !chatValueObj.bQuizEnable;
    $('#btn-no-quiz').text(chatValueObj.bQuizEnable? '퀴즈 끄기' : '퀴즈 켜기');
}

function onBtnSearchUser(e) {
    e.stopPropagation();

    var bVisible = getVisible(chatValueObj.wndSearchUser);
    setVisible(chatValueObj.wndSearchUser, !bVisible);
}

function onBtnCloseSearchUser(e) {
    e.stopPropagation();
    setVisible(chatValueObj.wndSearchUser, false);
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
        case 5:
            return "/images/star5.png";
        case 6:
            return "/images/star6.png";
        case 7:
            return "/images/star7.png";
        case 8:
            return "/images/star8.png";
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


    chatValueObj.chatBuffer.push(li);

    chatValueObj.FlushChat( mode );
}

function initSearch() {
    $('#search-area-1').html('');
    $('#search-area-1').css('display','inline-block');
    $('#ads-area-1').css('display','none');
    $('#search-area-2').html('');
    $('#search-area-2').css('display','inline-block');
    $('#ads-area-2').css('display','none');
    setVisible(chatValueObj.memoArea, false);
    chatValueObj.searchArea1.css('overflow-y', 'hidden');
}

function restoreSearch() {
    $('#search-area-1').css('display','none');
    $('#ads-area-1').css('display','inline-block');
    $('#search-area-2').css('display','none');
    $('#ads-area-2').css('display','inline-block');
    setVisible(chatValueObj.memoArea, true);
    chatValueObj.searchArea1.css('overflow-y', 'auto');
}

function searchWebRoot( socket, query, isBroadcast ) {
    initSearch();
    //$('#mid_quiz_search').html('');
    var nick = getNickName();
    socket.emit('search', {nickname: nick, msg: query, isBroadcast : isBroadcast });

    var queries = query.trim().split(' ');
    chatValueObj.lastSearchQuery = query;
    var chinese = false;
    var dongyo = false;
    var chienseQuery = '';
    var dongyoQuery = '';
    var chineseSubType = '';
    for( var i = 0 ; i < queries.length ; ++i ) {
        if( queries[i] === "한자") {
            chienseQuery = query.slice(0,query.indexOf(queries[i]));
            chineseSubType = 'chinese_only';
            chinese = true;
            break;
        }

        if( queries[i] === '동요' || queries[i] === '가사') {
            dongyo = true;
            dongyoQuery = query.slice(0,query.indexOf(queries[i]));
            break;
        }
    }

    if( !chinese && $('#cb_s7').is(':checked') ) {
        chienseQuery = query;
        chinese = true;
    }

    var searched = false;
    if( $('#cb_s0').is(':checked')) {
        var where = $('input[name=radio_s0]:checked').attr('value');
        searchWeb(0, query, where);
        searched = true;
    } //  백과사전
    if( $('#cb_s1').is(':checked')) {
        var where = $('input[name=radio_s1]:checked').attr('value');
        searchWeb(1, query, where);
        searched = true;
    } //  지시인
    if( $('#cb_s2').is(':checked')) {
        var where = $('input[name=radio_s2]:checked').attr('value');
        searchWeb(2, query, where);
        searched = true;
    } //  블로그
    if( $('#cb_s3').is(':checked')) {
        var where = $('input[name=radio_s3]:checked').attr('value');
        searchWeb(3, query, where);
        searched = true;
    } //  뉴스
    if( $('#cb_s4').is(':checked')) {
        var where = $('input[name=radio_s4]:checked').attr('value');
        searchWeb(4, query, where);
        searched = true;
    } //  이미지

    if( $('#cb_s5').is(':checked')) {
        var where = $('input[name=radio_s5]:checked').attr('value');
        searchWebGoogle(query, false, where);
        searched = true;
    } //  구글

    if( chinese ) {
        var where = $('input[name=radio_s7]:checked').attr('value');
        searchWebNaver(chienseQuery, chineseSubType, where);
    }

    if( dongyo ) {
        searchWebDongyo(dongyoQuery, 2);
    }

    if( $('#cb_s6').is(':checked')) {
        var where = $('input[name=radio_s6]:checked').attr('value');
        searchFromDB(query, where);
        searched = true;
    }
/*
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
*/
    if( !searched ) {
        //$('.search_article').html(htmlBackup);
        $('#sd_ret').css('display','none');
        $('#sd_ads').css('display','inline-block');
    }
}

function searchWeb( type, query, where ) {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            query : query,
            type: type,
            sockid: chatValueObj.sockid,
        }),
        contentType: 'application/json',
        url: '/searchex',
        success: function(data) {
            if( type != 4 ) {
                setSearchRet(data, false, where);
            }
            else {
                setSearchRetImage(data, true, where);
            }
        }
    });
}

function searchWebGoogle( query, grammer, where) {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            query : query,
            sockid: chatValueObj.sockid,
            grammer : grammer
        }),
        contentType: 'application/json',
        url: '/searchgoogle',
        success: function(data) {
            setSearchRet(data, true, where);
        }
    });
}

function searchWebNaver( query, subtype, where ) {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            query : query,
            subtype: subtype,
            sockid: chatValueObj.sockid
        }),
        contentType: 'application/json',
        url: '/searchnaver',
        success: function(data) {
            data.data = data.data.slice(0,2);
            data.hdata = data.hdata.slice(0,2);
            setSearchRet(data.data, true, where);
            setSearchRet(data.hdata, true, where);
        }
    });
}

function searchWebDongyo(query , where) {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            query : query,
            sockid: chatValueObj.sockid
        }),
        contentType: 'application/json',
        url: '/searchdongyo',
        success: function(data) {
            data.data = data.data.slice(0,2);
            setSearchRet(data.data, true, where);
        }
    });
}


function searchFromDB( query, where ) {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            query : query,
            sockid: chatValueObj.sockid
        }),
        contentType: 'application/json',
        url: '/searchdb',
        success: function(data) {
            setSearchDB(data, where);
        }
    });
}

var timerIDForDB = 0;
function setSearchDB(data, where) {
    var items = data.quizdatalist;
    var queries = data.queries;

    items.sort( function(item1, item2) {
        var cnt1 = 0, cnt2 = 0;
        var add = 1;
        for( var i = queries.length - 1 ; i >= 0 ; --i) {
            queries[i] = queries[i].replace('%', '');
            queries[i] = queries[i].replace('%', '');
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

    getSearchArea(where).prepend(htmlforleft);

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
    if( items && items.length > ret_cnt_val) {
        items = items.slice( 0, ret_cnt_val );
    }

    var html = '';
    for( var i = 0 ; i < items.length ; ++i) {
        var item = items[i];
        var hidx = item.description.indexOf('[총획]');
        var hidxend = item.description.indexOf('[난이도]');
        if( hidxend == -1 ) hidxend = hidx + 20;
        var hinfo = '<b>' + item.description.slice(hidx, hidxend).trim() + '</b>';
        var div = '<div class="search_ret_root">' +
            '<div class="search_ret_title">' +
            item.title + ' ' + hinfo +
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
        return chatValueObj.searchArea1;
    }
    else {
        return chatValueObj.searchArea2;
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

function isShowSearchChat() {
    if($('#cb_notshowsearchchat').is(':checked')) {
        return false;
    }

    return true;
}

function isDisableNoticeShow() {
    if(chatValueObj.cbNoticeDisable.is(':checked')) {
        return true;
    }

    return false;
}

function setDisableNoticeShow() {
    var bDisable = localStorage.getItem('cb-notice-disable') || 0;

    chatValueObj.cbNoticeDisable.attr('checked', bDisable == 1 ? true : false );

    chatValueObj.cbNoticeDisable.change(function() {
        if( $(this).is(':checked') ) {
            localStorage.setItem('cb-notice-disable', 1);
        }
        else {
            localStorage.setItem('cb-notice-disable', 0);
        }
    })
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
    var rbs_name = ['sb0', 'sb1', 'sb2', 'sb3', 'sb4', 'sb5', 'sb6', 'sb7'];
    var cbs = [$('#cb_s0'), $('#cb_s1'), $('#cb_s2'), $('#cb_s3'), $('#cb_s4'), $('#cb_s5'), $('#cb_s6'), $('#cb_s7')];

    var rbs = [$('input[name=radio_s0]'), $('input[name=radio_s1]'), $('input[name=radio_s2]'), $('input[name=radio_s3]'),
        $('input[name=radio_s4]'), $('input[name=radio_s5]'), $('input[name=radio_s6]'), $('input[name=radio_s7]')];
    var cbs_ret = new Array(cbs_name.length);
    var rbs_ret = new Array(rbs_name.length);
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

    $.each(rbs_name, function(idx, name) {
        rbs_ret[idx] = localStorage.getItem(name) || 1;
    })

    $.each(rbs, function(idx, item) {
        item.eq(rbs_ret[idx]-1).attr('checked', true);
        item.change(function() {
            localStorage.setItem(rbs_name[idx], this.value);
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