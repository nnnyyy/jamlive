/**
 * Created by nnnyy on 2018-08-10.
 */
"use strict"

function init( socket ) {
    G.socket = socket;
    searchObj.init();
    hintObj.init();
    chatObj.init();
    chatObj.addChat('chat', false, '왕야옹', '앙녕하세여앙녕하세여앙녕하세여앙녕하세여앙녕하세여앙녕하세여앙녕하세여앙녕하세여앙녕하세여', true, 50, '127.0.0.1', 1);
    setSocketEvent(socket);
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
}

var G = new GlobalValue();
var hintObj = new HintObject();
var chatObj = new ChatObject();
var voteObj = new VoteObject();
var searchObj = new SearchObject();

//  힌트 관련 변수
function HintObject() {
    this.modifyArea = $('#hint-modify-area');
    this.modifyTextArea = $('.memo-area');
    this.articleArea = $('#hint-article-area');
    this.btnModifyHint = $('#btn-modify-hint');
    this.btnModifyHint.click(onBtnModifyHint);
    this.bModifyMode = false;
}

HintObject.prototype.init = function() {
    this.hint = '테스트 힌트입니다';
    this.provider = '왕야옹';

    this.setHintMode( false );
    this.updateHint();
}

HintObject.prototype.setHintMode = function( bModify ) {
    setVisible(this.modifyArea, bModify );
    setVisible(this.articleArea, !bModify );
    this.bModifyMode = bModify;
    var str = bModify == true ? '수정완료' : '수정하기';
    this.btnModifyHint.text(str);

    if( bModify ) {
        this.modifyTextArea.val(this.hint.replace(/<br>/gi,'\n'));
    }
}

HintObject.prototype.updateHint = function() {
    this.articleArea.html(this.provider ? this.hint : '');
    //this.memoArea.html(this.memoProvider ? memo : '');
}

HintObject.prototype.onMemo = function(data) {
    this.hint = data.memo;
    this.provider = data.memo_provider;
    this.updateHint();
}

function onBtnModifyHint(e) {
    if( !hintObj.bModifyMode ) {
        hintObj.setHintMode(true);
    }
    else {
        hintObj.setHintMode(false);
    }
}

//  채팅 관련 변수
function ChatObject() {
    this.chatUI = $('.chat-ui');
    this.bFlushByTimer = false;
    this.chatBuffer = [];
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

function setSocketEvent( socket ) {
    socket.on('chat', onChat );
    socket.on('memo', hintObj.onMemo );
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

function setBtnEvent() {

}

function onChat( packet ) {

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