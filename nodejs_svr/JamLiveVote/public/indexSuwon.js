/**
 * Created by nnnyy on 2018-08-10.
 */
"use strict"

function init( socket ) {
    G.socket = socket;
    searchObj.init();
    hintObj.init();
    chatObj.init();
    setSocketEvent(socket);
    setKeyEvent();
    setBtnEvent();

    showBarChart('.ct-chart',['1번','2번','3번'],[[2,0,0]], {
        seriesBarDistance: 10,
        height: 120,
        axisX: {
            offset: 30
        },
        axisY: {
            offset: 30
        }
    });
}

var GlobalValue = function() {
    this.socket = null;
    this.sockid = '';
    this.isLogin = false;
}

var G = new GlobalValue();
var hintObj = new HintObject();
var chatObj = new ChatObject();
var voteObj = new VoteObject();
var searchObj = new SearchObject();
var topMenuObj = new TopMenuObject();

//  힌트 관련 변수
function HintObject() {
    this.hint = '';
    this.provider = '';
    this.modifyArea = $('#hint-modify-area');
    this.modifyTextArea = $('.memo-area');
    this.articleArea = $('#hint-article-area');
    this.btnModifyHint = $('#btn-modify-hint');
    this.btnModifyHint.click(onBtnModifyHint);
    this.btnModifyCancel = $('#btn-modify-hint-cancel');
    this.btnModifyCancel.click(onBtnModifyHintCancel);
    this.bModifyMode = false;
    this.hintProviderElem = $('hint-provider');
}

HintObject.prototype.init = function() {
    this.setHintMode( false );
    this.updateHint();
}

HintObject.prototype.setHintMode = function( bModify ) {
    setVisible(this.modifyArea, bModify );
    setVisible(this.articleArea, !bModify );
    setVisible(this.btnModifyCancel, bModify);
    this.bModifyMode = bModify;
    var str = bModify == true ? '수정완료' : '수정하기';
    this.btnModifyHint.text(str);

    if( bModify ) {
        this.modifyTextArea.val(this.articleArea.html().replace(/<br>/gi,'\n'));
    }
}

HintObject.prototype.sendHint = function() {
    var modifiedHint = this.modifyTextArea.val();
    modifiedHint = modifiedHint.replace(/(?:\r\n|\r|\n)/g, '<br>');
    G.socket.emit('memo', {memo: modifiedHint });
}

HintObject.prototype.sendIsUsableHint = function() {
    G.socket.emit('memo', {mode: 'isUsable' });
}

HintObject.prototype.sendCancel = function() {
    G.socket.emit('memo', {mode: 'cancel' });
}

HintObject.prototype.updateHint = function() {
    this.articleArea.html(this.provider ? this.hint : '');
    this.hintProviderElem.text(this.provider);
}

HintObject.prototype.onMemo = function(data) {
    if( data.mode == 'isUsable' ) {
        if( data.isAble == true ) {
            hintObj.setHintMode( true );
        }
    }
    else if( data.mode == 'cancel' ) {
        hintObj.setHintMode(false);
    }
    else {
        hintObj.hint = data.memo;
        hintObj.provider = data.memo_provider;
        hintObj.setHintMode(false);
        hintObj.updateHint();
    }
}

function onBtnModifyHint(e) {
    if( !hintObj.bModifyMode ) {
        hintObj.sendIsUsableHint();
    }
    else {
        //  수정한 내역을 서버에 보냅니다.
        hintObj.sendHint();
    }
}

function onBtnModifyHintCancel(e) {
    hintObj.sendCancel();
}

//  채팅 관련 변수
function ChatObject() {
    this.chatUI = $('.chat-ui');
    this.bFlushByTimer = false;
    this.chatBuffer = [];
    this.chatInputNameElem = $('#ip-nick');
    this.chatInputMsgElem = $('#ip-msg');
    this.bTrigger = false;
}

ChatObject.prototype.init = function() {
    setInterval(function() {
        chatObj.bFlushByTimer = true;
        chatObj.FlushChat();
    }, 1000);
}

ChatObject.prototype.FlushChat = function( mode ) {
    var tCur = new Date();
    if( mode == "vote" || this.chatBuffer.length >= 3 || this.bFlushByTimer  ) {

        var bAutoMoveToBottom = false;
        var chatwndheight = this.chatUI.height();

        var list = this.chatUI.find('li');

        if( list.length > 50 ) {
            list.eq(0).remove();
        }

        if( (this.chatUI.get(0).scrollTop == (this.chatUI.get(0).scrollHeight - chatwndheight - 20/* padding */) ) ||
            $('#cb_auto_scroll').is(':checked')) {
            bAutoMoveToBottom = true;
        }

        var html = '';
        for( var i = 0 ; i < this.chatBuffer.length ; ++i ) {
            html += this.chatBuffer[i];
        }

        this.chatUI.append(html);

        //  끝 정렬
        if( bAutoMoveToBottom ) {
            this.chatUI.scrollTop(this.chatUI.get(0).scrollHeight);
        }

        this.chatBuffer = [];
        this.bFlushByTimer = false;
    }
}

ChatObject.prototype.addChat = function( mode, isbaned , nick, msg, bStrip,auth, ip, sockid ) {
    /*
    var li =    '<li class="chat_item" mode="' + mode +'">' +
        '<div type="msg-obj">' +
        '<div type="nick" ip="'+ ip +'" sockid="' + sockid + '"><img type="grade" src="' + getGradeImage(auth, isbaned) +'"/><div type="nick-only">' + name +'</div><div type="ip-only">' + (ip ? ('(' + ip + ')') : '') + '</div></div>' +
        '<div type="msg">' + ( bStrip ? strip(msg) : msg ) + '</div>' +
        '<data class="chat_name"></data>' +
        '</div>' +
        '</li>';
*/
    var li =    '<li>' +
                    '<div class="chat-msg-item" mode="' + mode +'">' +
                        '<div class="nick-area">' +
                            '<div class="grade"><img src="' + getGradeImage(auth, isbaned) + '"></div>' +
                            '<div class="nick" ip="'+ ip +'" sockid="'+ sockid +'">' + nick + '</div>' +
                            '<div class="ip">('+ ip + ')</div>' +
                        '</div>' +
                        '<div class="msg-area">' +
                            msg +
                        '</div>' +
                    '</div>' +
                '</li>';

    this.chatBuffer.push(li);

    this.FlushChat( mode );
}

//  투표 관련 변수
function VoteObject() {

}

function SearchObject() {
    this.area = [$('#search-area-left'), $('#search-area-center')];
}

SearchObject.prototype.init = function() {
    console.log('searchObject init');
    for( var i = 0 ; i < this.area.length ; ++i ) {
        setVisible(this.area[i], false);
    }
}

function TopMenuObject() {
    this.btnLogin = $('#btn-login');
    this.btnLogin.click( onBtnLogin );
    this.btnLogout = $('#btn-logout');
    this.btnLogout.click( onBtnLogout );
}

function onBtnLogin(e) {
    window.location.href = '/signin';
}

function onBtnLogout(e) {
    logout();
}

function setSocketEvent( socket ) {
    socket.on('chat', onChat );
    socket.on('memo', hintObj.onMemo );
    socket.on('serv_msg', onServMsg);
    socket.on('myid', onMyID);
    //socket.on('serv_msg', onServMsg);
    //socket.on('quiz', onQuiz);
    //socket.on('quizret', onQuizRet);
    //socket.on('emoticon', onEmoticon);
    //socket.on('next-quiz', onNextQuiz);
    //socket.on('connect', connectStateInfo.Connect );
    //socket.on('disconnect', connectStateInfo.Disconnect);
    //socket.on('update-user', onUpdateUser);
    //socket.on('update-users', onUpdateUsers);
}

function setKeyEvent() {
    chatObj.chatInputMsgElem.keypress(onInputMsgKeyPress);
    chatObj.chatInputMsgElem.keyup(onInputMsgKeyUp);
    $(document).keydown(onGlobalKeyDown);
}

function onGlobalKeyDown(e) {
    var code = (e.which ? e.which : e.keyCode );

    if( chatObj.chatInputNameElem.is(':focus') ) return;
    if( chatObj.chatInputMsgElem.is(':focus') ) return;
    if( hintObj.modifyTextArea.is(':focus')) return;
    //if( $('#ip-search-user-name').is(':focus') ) return;

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
            chatObj.chatInputMsgElem.val('');
            chatObj.chatInputMsgElem.focus();
            chatObj.bTrigger = true;
        }
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
        else if( msg == "ㅎㅇ") {
            mode = "emoticon";
            emoticon = "hi";
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
        G.socket.emit('chat', {nickname: nick, msg: msg, isvote: isvote, mode: mode, emoticon: emoticon });
        $(this).val('');
    }
}

function onInputMsgKeyUp(e) {
    var msg = $(this).val();
    var code = (e.which ? e.which : e.keyCode );
    if( chatObj.bTrigger ) {
        chatObj.bTrigger = false;
        return;
    }

    var isvote = -1;

    if( isvote != -1 ) {
        $(this).val('');
    }

    if( code == 27 ) {
        $(this).blur();
    }
}

function setBtnEvent() {

}

function onChat( data ) {
    if( data.mode == "vote" ) {
        if( data.isLogin ) {
            data.nickname = '<div class="logined_font">' + data.nickname + '</div>';
        }

        if( isShowMemberVoteOnly() &&
            ( (typeof data.auth == 'undefined') || (data.auth < 0 ) )
        ) {
            chatObj.addChat( data.mode, data.isBaned, data.nickname, '<b>투표했습니다.</b>', false, data.auth, data.ip, data.sockid );
        }
        else {
            chatObj.addChat( data.mode, data.isBaned, data.nickname, '<b style="color: '+ color[data.vote] + '">' + data.msg + '</b>', false, data.auth, data.ip, data.sockid);
        }
        setMsgVisible( data.mode, $('#cb_votemsg').is(':checked') ? false : true );
    }
    else if( data.mode == "search") {
        if( !isShowSearchChat() ) return;
        if( data.isLogin ) {
            data.nickname = '<div class="logined_font">' + data.nickname + '</div>';
        }
        chatObj.addChat( data.mode, data.isBaned, data.nickname, '<b style="color: #1b3440">' + data.msg + '</b>', false, data.auth, data.ip, data.sockid);
    }
    else if ( data.mode == "notice") {
        if( isDisableNoticeShow() ) return;
        chatObj.addChat( data.mode, data.isBaned, '<notice-nick>알림</notice-nick>', '<notice-nick>' + data.msg + '</notice-nick>', false, data.auth, data.ip, data.sockid);
    }
    else if ( data.mode == "ban") {
        chatObj.addChat( data.mode, data.isBaned, data.nickname, '<b>' + data.msg + '</b>', false, data.auth, data.ip, data.sockid);
    }
    else {
        if( isNotShowChat() ) return;
        if( data.admin ) {
            chatObj.addChat( data.mode, data.isBaned, '<div class="admin-nick">' + data.nickname + '</div>', '<div class="admin-nick">' + data.msg + '</div>', false, data.auth, data.ip, data.sockid);
        }
        else if( data.isLogin ) {
            chatObj.addChat( data.mode, data.isBaned, '<div class="logined_font">' + data.nickname + '</div>', data.msg, false, data.auth, data.ip, data.sockid);
        }
        else {
            chatObj.addChat( data.mode, data.isBaned, data.nickname, data.msg, true, data.auth, data.ip, data.sockid );
        }

    }
}

function onServMsg(data) {
    showAdminMsg(data.msg);
}

function onMyID(data) {

    G.sockid = data.socket;
    G.isLogin = data.isLogined;
    setNickName(data.nick);
    //setShowMemberVoteOnlyListener();}
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
    obj.html(msg);
    obj.css('opacity', '0.85');
    animOpacityTimerID = setTimeout(function() {
        $('.admin_msg').css('opacity', '0');
    }, 7000);

}

function setNickName( nick ) {
    chatObj.chatInputNameElem.val(nick);
}

function getNickName() {
    var nick = strip(chatObj.chatInputNameElem.val());
    nick = nick.substr(0,6);
    return nick;
}

function setVisible(elem, visible) {
    elem.css('display', visible ? 'inline-block' : 'none');
}

function getVisible(elem) {
    if( elem.css('display') === 'none' ) return false;

    return true;
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

function isNotShowChat() {
    var checked = localStorage.getItem('cb_notshowchat') || 0;
    return checked == 1 ? true : false;
}