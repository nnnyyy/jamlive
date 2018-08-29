/**
 * Created by nnnyyy on 2018-06-28.
 */

var GlobalValue = function() {
    this.socket = null;
    this.voteBtns = $('div[type="vote-btn"]');
    this.chatUI = $('.chat-ui');
    this.nick = $('.ip-name');
    this.chatBuffer = [];
    this.bFlushByTimer = false;
    this.btnLogin = $('#btn-login');
    this.btnLogout = $('#btn-logout');
    this.btnSettings = $('#btn-settings');
    this.btnCloseSettings = $('#btn-close-settings');
    this.settingsUI = $('#settings');
    this.myid = '';
    this.isLogin = false;

    this.adminMsg = $('.admin_msg');
    this.animOpacityTimerID = -1;

    this.quizWnd = $('.quiz_wnd');
    this.idInterval = new Date();
    this.quizData =  null;

}

GlobalValue.prototype.init = function(socket) {
    this.socket = socket;
    //  모든 초기화는 여기에서
    registerBtnListener(this);
    registerSocketListener(this);

    setVisible(this.settingsUI, false);
    setVisible(this.quizWnd, false);

    setShowMemberVoteOnlyListener();
    setMinVoteSliderListener();

    setInterval(function() {
        global.bFlushByTimer = true;
        global.FlushChat();
    }, 1000);

    console.log('init complete');
}

GlobalValue.prototype.onChat = function( data ) {
    if( data.mode == "vote" ) {
        if( data.isLogin ) {
            data.nickname = '<div class="logined_font">' + data.nickname + '</div>';
        }

        if( isShowMemberVoteOnly() &&
            ( (typeof data.auth == 'undefined') || (data.auth < 0 ) )
        ) {
            global.addChat( data.mode, data.isBaned, data.nickname, '<b>투표했습니다.</b>', false, data.auth, data.ip, data.sockid );
        }

        else  {
            global.addChat( data.mode, data.isBaned, data.nickname, '<b style="color: '+ color[data.vote] + '">' + data.msg + '</b>', false, data.auth, data.ip, data.sockid);
        }
    }
    else if( data.mode == "search") {
        if( !isShowSearchChat() ) return;
        if( data.isLogin ) {
            data.nickname = '<div class="logined_font">' + data.nickname + '</div>';
        }
        global.addChat( data.mode, data.isBaned, data.nickname, '<b style="color: #1b3440">' + data.msg + '</b>', false, data.auth, data.ip, data.sockid);
    }
    else if ( data.mode == "notice") {
        global.addChat( data.mode, data.isBaned, '<notice-nick>알림</notice-nick>', '<notice-nick>' + data.msg + '</notice-nick>', false, data.auth, data.ip, data.sockid);
    }
    else if ( data.mode == "ban") {
        global.addChat( data.mode, data.isBaned, data.nickname, '<b>' + data.msg + '</b>', false, data.auth, data.ip, data.sockid);
    }
    else {

        if( data.admin ) {
            global.addChat( data.mode, data.isBaned, '<div class="admin-nick">' + data.nickname + '</div>', '<div class="admin-nick">' + data.msg + '</div>', false, data.auth, data.ip, data.sockid);
        }
        else if( data.isLogin ) {
            global.addChat( data.mode, data.isBaned, '<div class="logined_font">' + data.nickname + '</div>', data.msg, false, data.auth, data.ip, data.sockid);
        }
        else {
            global.addChat( data.mode, data.isBaned, data.nickname, data.msg, true, data.auth, data.ip, data.sockid );
        }

    }
}

GlobalValue.prototype.onProcessVoteData = function( data ) {
    var votedata = data.vote_data;
    var users = votedata.users;
    $('[type="conn-cnt"]').text(users + '명');
    //$('vote_except').text(votedata.bans);

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
        height: 100,
        axisX: {
            offset: 20
        },
        axisY: {
            offset: 20
        }
    });
}

function showAdminMsg(msg) {
    if( global.animOpacityTimerID != -1 ) {
        clearTimeout(global.animOpacityTimerID);
        global.animOpacityTimerID = -1;
        global.adminMsg.removeClass('opacity');
        global.adminMsg.addClass('non_opacity');
    }
    global.adminMsg.addClass('opacity');
    global.adminMsg.removeClass('non_opacity');
    global.adminMsg.html(msg);
    global.adminMsg.css('opacity', '0.85');
    global.animOpacityTimerID = setTimeout(function() {
        global.adminMsg.css('opacity', '0');
    }, 7000);

}

GlobalValue.prototype.onEmoticon = function( _data ) {
    switch( _data.name ) {
        case "bbam":
            global.addChat( "", false, _data.nick, '<img style="width:40px; height:40px;" src="/images/hong_shock.png"/>', false, _data.auth);
            break;

        case "ddk":
            global.addChat( "", false, _data.nick, '<img style="width:40px; height:40px;" src="/images/ddoddoke.png"/>', false, _data.auth);
            break;

        case "yeee":
            global.addChat( "", false, _data.nick, '<img style="width:40px; height:40px;" src="/images/yeee.png"/>', false, _data.auth);
            break;

        case "hi":
            global.addChat( "", false, _data.nick, '<img style="width:40px; height:40px;" src="/images/hi.png"/>', false, _data.auth);
            break;
    }
}

GlobalValue.prototype.onMyID = function(data) {
    global.myid = data.socket;
    global.isLogin = data.isLogined;

    console.log(data.isLogined + ' : ' + global.isLogin);

    setNickName( data.nick );
    setShowMemberVoteOnlyListener();
}

GlobalValue.prototype.onServMsg = function(data) {
    showAdminMsg(data.msg);
}

GlobalValue.prototype.onQuiz = function(data) {
    $('.q_q').each(function(idx){
        $(this).css('background-color','transparent');
    })
    setVisible(global.quizWnd, true);
    global.quizdata = data.quizdata;
    $('.q_title').text(data.quizdata.question);
    var html = '';
    $('.q_q').each(function(idx) {
        var t = (idx+1) + '. ' + data.quizdata.answer[idx];
        html += (t + '</br>');
        $(this).text(t);
    })

    global.addChat( "", false, '<div class="notice_font">퀴즈</div>', data.quizdata.question + '</br>' + html, false);

    tStartQuiz = new Date();

    clearInterval(global.idInterval);
    global.idInterval = setInterval(function() {
        var remain = Math.floor((11000 - (Date.now() - tStartQuiz)) / 1000);
        if( remain <= 0 ) remain = 0;
        $('time').text(remain);
    }, 100);
}

GlobalValue.prototype.onQuizRet = function(_data) {
    if( !global.quizdata ) return;

    $('.q_q').each(function(idx){
        if( idx == _data.collect_idx ) {
            $(this).css('background-color','blue');
            var collect_rate = (_data.collect_cnt / _data.total_cnt) * 100.0;
            global.addChat( "", false, '<div class="notice_font">퀴즈 정답</div>', '<b><div style="color:' + color[idx] + '">' + (idx+1) + '번 '+ global.quizdata.answer[idx]  + ' ( 정답률 : ' + collect_rate + '% )</div></b>', false);
        }
    })

    setTimeout(function() {
        setVisible(global.quizWnd, false);
    }, 3000);
}

GlobalValue.prototype.addChat = function( mode, isbaned , name, msg, bStrip,auth, ip, sockid ) {
    var li = '<li>' +
            '<div type="msg-root">' +
            '<div type="image"><img type="grade" src="' + getGradeImage(auth, isbaned) +'"/></div>' +
            '<div type="nick" ip="'+ ip +'" sockid="' + sockid + '">'+ name + '</div>' +
            '<div type="msg">' + ( bStrip ? strip(msg) : msg ) + '</div>' +
            '</div>' +
            '</li>';

    global.chatBuffer.push(li);

    global.FlushChat( mode );
}

GlobalValue.prototype.FlushChat = function( mode ) {
    var tCur = new Date();
    if( mode == "vote" || global.chatBuffer.length >= 3 || global.bFlushByTimer  ) {

        var bAutoMoveToBottom = false;
        var chatwndheight = global.chatUI.height();

        var list = global.chatUI.find('li');

        if( list.length > 30 ) {
            list.eq(0).remove();
        }

        if( (global.chatUI.get(0).scrollTop == (global.chatUI.get(0).scrollHeight - chatwndheight - 20/* padding */) ) ||
            $('#cb_auto_scroll').is(':checked')) {
            bAutoMoveToBottom = true;
        }

        var html = '';
        for( var i = 0 ; i < global.chatBuffer.length ; ++i ) {
            html += global.chatBuffer[i];
        }

        global.chatUI.append(html);

        //  끝 정렬
        if( bAutoMoveToBottom ) {
            global.chatUI.scrollTop(global.chatUI.get(0).scrollHeight);
        }

        global.chatBuffer = [];
        global.bFlushByTimer = false;
    }
}

var global = new GlobalValue();

function vote(socket, data) {
    data.nickname = getNickName();
    socket.emit('vote', {idx: data});
}

function getNickName() {
    var nick = strip(global.nick.text());
    nick = nick.substr(0,6);
    return nick;
}

function setNickName( nick ) {
    global.nick.text(nick);
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
        case 9:
            return "/images/star9.png";
        case 10:
            return "/images/star9.png";
        case 11:
            return "/images/star9.png";
        case 50:
            return "/images/admin.png";
        case 99:
            return "/images/noti.png";
        default:
            return "/images/guest.png";
    }

    return "";
}


function setVisible(elem, visible) {
    elem.css('display', visible ? 'inline-block' : 'none');
}

function setShowMemberVoteOnlyListener() {

    if( !global.isLogin ) {
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

function setShowMemberVoteOnlyListener() {
    console.log(global.isLogin);
    if( !global.isLogin ) {
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

function isShowMemberVoteOnly() {
    if($('.cb_show_member_vote_only').is(':checked')) {
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

function isShowSearchChat() {
    if($('#cb_notshowsearchchat').is(':checked')) {
        return false;
    }

    return true;
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

function registerBtnListener(g) {
    g.voteBtns.each(function(idx) {
        $(this).click(function(e) {
            //  투표 버튼
            vote(g.socket, $(this).attr('value'));
        })
    })

    g.btnLogin.click(function(e) {
        window.location.href = '/signin';
    })

    g.btnLogout.click(function(e) {
        logout();
    })

    g.btnSettings.click(function(e) {
        setVisible( g.settingsUI, true );
    });

    g.btnCloseSettings.click(function(e) {
        setVisible( g.settingsUI, false );
    })
}

function registerSocketListener(g) {
    g.socket.on('chat', g.onChat);
    g.socket.on('vote_data', g.onProcessVoteData);
    g.socket.on('emoticon', g.onEmoticon);
    g.socket.on('myid', g.onMyID);
    g.socket.on('serv_msg', g.onServMsg);
    g.socket.on('quiz', g.onQuiz);
    g.socket.on('quizret', g.onQuizRet);
    g.socket.on('reconn-server', function(data) {
        if( data.reason == 'baned') {
            alert('이용 자격이 없음이 확인되어 영구밴 당하셨습니다.');
            window.location.href = 'jamlive.net';
        }
        else {
            window.location.href = 'http://' + data.url;
        }
        return;
    });


}