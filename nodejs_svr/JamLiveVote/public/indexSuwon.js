/**
 * Created by nnnyy on 2018-08-10.
 */
"use strict"

function init( socket ) {
    G.socket = socket;
    searchObj.init();
    hintObj.init();
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
    this.articleArea = $('#hint-article-area');
    this.btnModifyHint = $('#btn-modify-hint');
    this.btnModifyHint.click(onBtnModifyHint);
    this.bModifyMode = false;
}

HintObject.prototype.init = function() {
    this.setHintMode( false );
}

HintObject.prototype.setHintMode = function( bModify ) {
    setVisible(this.modifyArea, bModify );
    setVisible(this.articleArea, !bModify );
    this.bModifyMode = bModify;
    var str = bModify == true ? '수정완료' : '수정하기';
    this.btnModifyHint.text(str);
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