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
    this.socketid = '';
    this.isLogin = false;

    this.vAdminMsg = new Vue({
        el: '#admin-msg-root',
        data: {
            show: false,
            msg: '',
            isOpacity: 0,
            isNonOpacity: 0,
            opacity: 0
        }
    });

    this.vSettings = new Vue({
        el: '#settings',
        data: {
            visible: false,
            maxVoteDuplicate: {
                checked: false,
                storage: 'max_vote_dupl'
            },
            showAllServerVote: {
                checked: false,
                storage: 'show_all_server_vote',
                disabled: true
            },
            showMemberVoteOnly: {
                checked: false,
                storage: 'show_high_level_vote_only',
                disabled: true
            },
            min_vote: 0
        },
        methods: {
            onBtnClose: function() {
                this.visible = false;
            },
            onChange: function(localStorageName, obj, event) {
                if( event.target.checked === true) {
                    obj.checked = true;
                    localStorage.setItem(localStorageName, 1);
                }
                else {
                    obj.checked = false;
                    localStorage.setItem(localStorageName, 0);
                }
            }
        }
    });

    this.vTopTitle = new Vue({
        el: '#top-title',
        data: {
            name: '',
            name_visible: false,
            ap: 0,
            ap_visible: false
        }
    })

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

    setVisible(this.quizWnd, false);

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

function onAdminMsg(data) {
    global.addChat( "admin", false, "서버메시지", data.msg, false, 50, '', 0 );
}

GlobalValue.prototype.onProcessVoteData = function( data ) {
    var votedata = data.vote_data;
    var users = votedata.users;
    $('[type="conn-cnt"]').text(users + '명');
    //$('vote_except').text(votedata.bans);

    var total = [0,0,0];

    //  상위 레벨 투표 결과
    for( var i = 0 ; i < votedata.searched_cnt.length ; ++i ) {
        total[i] += votedata.searched_cnt[i];
    }

    //  일반 레벨 (로그인한) 투표 결과
    if( !isShowMemberVoteOnly() ) {
        for( var i = 0 ; i < votedata.cnt.length ; ++i ) {
            total[i] += votedata.cnt[i];
        }
    }

    if( isShowAllServerVote() ) {
        for( var i = 0 ; i < 3 ; ++i ) {
            total[i] += votedata.totalVote[i];
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

    var minVoteVal = Number(global.vSettings.min_vote);

    if( totalCnt <= minVoteVal) {
        total = [0,0,0];
    }

    showBarChart('.ct-chart',['1번','2번','3번'],[total], {
        seriesBarDistance: 10,
        height: 80,
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
        global.vAdminMsg.isOpacity = false;
        global.vAdminMsg.isNonOpacity = true;
    }
    global.vAdminMsg.show = true;
    global.vAdminMsg.isOpacity = true;
    global.vAdminMsg.isNonOpacity = false;
    global.vAdminMsg.msg = msg;
    global.vAdminMsg.opacity = 0.85;
    global.animOpacityTimerID = setTimeout(function() {
        global.vAdminMsg.opacity = 0;
        global.vAdminMsg.show = false;
    }, 2000);

}

GlobalValue.prototype.onEmoticon = function( _data ) {
    switch( _data.name ) {
        case "bbam":
            chatObj.addChat( "", false, _data.nick, '<img style="width:80px; height:80px;" src="/images/hong_shock.png"/>', false, _data.auth);
            break;

        case "ddk":
            chatObj.addChat( "", false, _data.nick, '<img style="width:80px; height:80px;" src="/images/ddoddoke.png"/>', false, _data.auth);
            break;

        case "yeee":
            chatObj.addChat( "", false, _data.nick, '<img style="width:80px; height:80px;" src="/images/yeee.png"/>', false, _data.auth);
            break;

        case "hi":
            chatObj.addChat( "", false, _data.nick, '<img style="width:80px; height:80px;" src="/images/hi.png"/>', false, _data.auth);
            break;

        case "by":
            chatObj.addChat( "", false, _data.nick, '<img style="width:80px; height:80px;" src="/images/by.png"/>', false, _data.auth);
            break;

        case "daebak":
            chatObj.addChat( "", false, _data.nick, '<img style="width:80px; height:80px;" src="/images/emo_daebak.png"/>', false, _data.auth);
            break;

        case "ua":
            chatObj.addChat( "", false, _data.nick, '<img style="width:80px; height:80px;" src="/images/ua.png"/>', false, _data.auth);
            break;
    }
}

GlobalValue.prototype.onLoginInfo = function(data) {
    global.socketid = data.socket;
    global.isLogin = data.isLogined;
    global.auth = data.auth;;

    setNickName( data.nick );
    setShowAllServerVote();
    setShowMemberVoteOnly();
}

GlobalValue.prototype.onAP = function(data) {
    global.vTopTitle.ap = data.ap;
    global.vTopTitle.ap_visible = true;
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
    global.vTopTitle.name_visible = true;
    global.vTopTitle.name = nick;
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
            return "/images/star0.png";
        case 1:
            return "/images/star1.png";
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
            return "/images/star10.png";
        case 11:
            return "/images/star11.png";
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

function isMaxVoteDuplicateChecked() {
    return global.vSettings.maxVoteDuplicate.checked;
}

function isShowAllServerVote() {
    return global.auth >=4 && global.vSettings.showAllServerVote.checked;
}

function isShowMemberVoteOnly() {
    return global.vSettings.showMemberVoteOnly.checked;
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
            global.vSettings.min_vote = ui.value;
        }
    });

    $('.min_vote_slider').slider('value', min_vote_val);
    global.vSettings.min_vote = min_vote_val;

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

    var max_vote_dupl = localStorage.getItem(global.vSettings.maxVoteDuplicate.storage) || 0;
    global.vSettings.maxVoteDuplicate.checked = max_vote_dupl == 1 ? true : false;
}

function setShowAllServerVote() {
    if( global.auth < 4 ) {
        global.vSettings.showAllServerVote.disabled = true;
        global.vSettings.showAllServerVote.checked = false;
    }
    else {
        global.vSettings.showAllServerVote.disabled = false;
        var max_vote_dupl = localStorage.getItem(global.vSettings.showAllServerVote.storage) || 0;
        global.vSettings.showAllServerVote.checked = max_vote_dupl == 1 ? true : false;
    }
}

function setShowMemberVoteOnly() {
    if( !global.isLogin ) {
        global.vSettings.showMemberVoteOnly.disabled = true;
        global.vSettings.showMemberVoteOnly.checked = false;
    }
    else {
        global.vSettings.showMemberVoteOnly.disabled = false;
        var max_vote_dupl = localStorage.getItem(global.vSettings.showMemberVoteOnly.storage) || 0;
        global.vSettings.showMemberVoteOnly.checked = max_vote_dupl == 1 ? true : false;
    }
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
        g.vSettings.visible = true;
    });

    g.btnCloseSettings.click(function(e) {
        e.stopPropagation();
        e.preventDefault();
        g.vSettings.visible = false;
    })
}

function registerSocketListener(g) {
    g.socket.on('chat', g.onChat);
    g.socket.on('admin-msg', onAdminMsg);
    g.socket.on('vote_data', g.onProcessVoteData);
    g.socket.on('emoticon', g.onEmoticon);
    g.socket.on('loginInfo', g.onLoginInfo);
    g.socket.on('ap', g.onAP);
    g.socket.on('serv_msg', g.onServMsg);
    g.socket.on('quiz', g.onQuiz);
    g.socket.on('quizret', g.onQuizRet);
    g.socket.on('reconn-server', function(data) {
        if( data.reason == 'baned') {
            alert('이용 자격이 없음이 확인되어 영구밴 당하셨습니다.');
            window.location.href = 'http://jamlive.net';
        }
        else if( data.reason == 'limit' ) {
            window.location.href = 'http://jamlive.net';
        }
        else {
            window.location.href = 'http://' + data.url;
        }
        return;
    });


}