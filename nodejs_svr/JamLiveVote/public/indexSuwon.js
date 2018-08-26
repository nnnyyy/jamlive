/**
 * Created by nnnyy on 2018-08-10.
 */
"use strict"

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

function init( socket, stringTable ) {
    G.socket = socket;
    G.stringTable = stringTable;
    setVisible($('.user-menu'), false);

    var noticeFirst = localStorage.getItem('notice-first') | 0;
    if( noticeFirst != 0 ) {
        setVisible($('#notice-wrapper'), false);
    }

    var tCur = new Date();
    localStorage.setItem('refreshtime', tCur.toString());

    searchObj.init();
    hintObj.init();
    chatObj.init();
    options.init();
    chosungGameMan.init();
    setSocketEvent(socket);
    setKeyEvent();
    setBtnEvent();

}

var GlobalValue = function() {
    this.socket = null;
    this.sockid = '';
    this.isLogin = false;
    this.connUserElem = $('#conn-cnt');
    this.banElem = $('#ban-cnt');
    this.weekdayElem = $('next-quizday');
    this.quizinfoElem = $('next-quiz-info');
    this.usersMap = new Map();
    this.connUserList = $('#conn-users-list');
    this.tLastUserUpdate = 0;
}

GlobalValue.prototype.onNextQuiz = function (data) {
    var weekdayname = ['월요일', '화요일','수요일','목요일','금요일','토요일','일요일'];
    var tTime = new Date('1980-01-01T' + data.data.time);
    var tCur = new Date();
    var bToday = false;
    if( data.data.weekday === ( tCur.getDay() - 1 )) {
        bToday = true;
    }

    var qinfo = '<next-quiz-type>' + data.data.name + '</next-quiz-type>' + ' ' + tTime.getHours() + G.stringTable['hour'] + ' ' + tTime.getMinutes().toString() + G.stringTable['minute'];
    G.weekdayElem.text(bToday? G.stringTable['today'] : weekdayname[data.data.weekday]);
    G.quizinfoElem.html(qinfo);
}

function ChosungGameMan() {
    this.questionTypeName = ['사전', '음식', '관용표현', '해산물', '날씨', '식물', '영화주인공', '나루토', '과일', '화가', '장소'];
    this.questionType = 0;
}

ChosungGameMan.prototype.init = function() {
    setVisibleBlock(quizObj.randomQuizRootElem, true);
    setVisibleBlock(quizObj.jaumQuizRootElem, false);
}

ChosungGameMan.prototype.setUI = function() {
    setVisibleBlock(quizObj.randomQuizRootElem, false);
    setVisibleBlock(quizObj.jaumQuizRootElem, true);
}

ChosungGameMan.prototype.closeUI = function() {
    setVisibleBlock(quizObj.randomQuizRootElem, true);
    setVisibleBlock(quizObj.jaumQuizRootElem, false);
}

ChosungGameMan.prototype.setText = function(word) {
    $('jaum-notice').text(word);
}

ChosungGameMan.prototype.onPacket = function( packet ) {
    if( packet.step == 'start' ) {
        chosungGameMan.setText('곧 초성게임이 사작 됩니다!');
        chosungGameMan.setUI();
    }
    else if( packet.step == 'q') {
        chatObj.addChat('chat', false, '초성게임', '새로운 문제가 출제 되었습니다 - ' + packet.q, false, 99, '', '' );
        if( packet.prev_q ) {
            showAdminMsg('정답은 ' + packet.prev_q + '였습니다');
        }
        chosungGameMan.questionType = packet.type;
        var typeName = chosungGameMan.questionTypeName[chosungGameMan.questionType];
        chosungGameMan.setText('[' + typeName + '] ' + packet.q);
    }
    else if( packet.step == 'msg' ) {
        chatObj.addChat('chat', false, '초성게임', packet.msg, false, 99, '', '' );
    }
    else if( packet.step == 'result' ) {
        chatObj.addChat('chat', false, '초성게임', '퀴즈가 종료 되었습니다', false, 99, '', '' );
        chosungGameMan.closeUI();
    }
    else if( packet.step == 'wait') {
        chosungGameMan.setUI();
        chosungGameMan.setText('초성게임이 진행 중입니다');
    }
    else if( packet.step == 'stop') {
        showAdminMsg('초성 게임이 강제 종료 되었습니다');
        chosungGameMan.closeUI();
    }
    else if( packet.step == 'q-hint') {
        chatObj.addChat('chat', false, '초성게임', '힌트가 도착했습니다', false, 99, '', '' );
        var typeName = chosungGameMan.questionTypeName[chosungGameMan.questionType];
        chosungGameMan.setText('[' + typeName + '] ' + packet.q);
    }
    else if( packet.step == 'fail') {
        var msg = '실패 했습니다! 답은 ' + packet.q;
        chatObj.addChat('chat', false, '초성게임', msg, false, 99, '', '' );
        showAdminMsg(msg);
    }
}

function Options() {

}

Options.prototype.init = function() {
    this.initSettings();

    //  투표 메시지 안보이게 하기
    var checked = localStorage.getItem('cb_votemsg') || 0;
    $('#cb_votemsg').attr('checked', checked == 1 ? true : false );

    $('#cb_votemsg').change(function() {
        if( $(this).is(':checked') ) {
            chatObj.setMsgVisible('vote', false);
            localStorage.setItem('cb_votemsg', 1);

        }
        else {
            chatObj.setMsgVisible('vote', true);
            localStorage.setItem('cb_votemsg', 0);
        }
    });


    this.setShowMemberVoteOnly();
    this.setSearchUserVoteOnly();

    //  투표 몇 표 이상일 경우 보여줄까?
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


    //  결과 몇개까지 보여줄까?
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

    //  투표 동률일 때 표시?
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


    // 검색 Top 5 보기
    var checked = localStorage.getItem('cb_searchTopFive') || 0;
    $('#cb_top_five').attr('checked', checked == 1 ? true : false );

    $('#cb_top_five').change(function() {
        if( $(this).is(':checked') ) {
            searchObj.onSearchRetRank([], '');
            localStorage.setItem('cb_searchTopFive', 1);
        }
        else {
            searchObj.onSearchRetRank([], '');
            localStorage.setItem('cb_searchTopFive', 0);
        }
    });

    //  채팅 안보기
    var checked = localStorage.getItem('cb_notshowchat') || 0;
    $('#cb_notshowchat').attr('checked', checked == 1 ? true : false );

    $('#cb_notshowchat').change(function() {
        if( $(this).is(':checked') ) {
            localStorage.setItem('cb_notshowchat', 1);
            console.log('setShowChatOptions - ' + 1 );
        }
        else {
            localStorage.setItem('cb_notshowchat', 0);
            console.log('setShowChatOptions - ' + 0 );
        }
    });


    var bDisable = localStorage.getItem('cb-notice-disable') || 0;

    chatObj.cbNoticeDisable.attr('checked', bDisable == 1 ? true : false );

    chatObj.cbNoticeDisable.change(function() {
        if( $(this).is(':checked') ) {
            localStorage.setItem('cb-notice-disable', 1);
        }
        else {
            localStorage.setItem('cb-notice-disable', 0);
        }
    })
}

Options.prototype.initSettings = function() {
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

Options.prototype.setShowMemberVoteOnly = function() {
    //  고정닉 투표만 보기 ( 손님투표 거르기 )
    if( !G.isLogin ) {
        $('.cb_show_member_vote_only').attr('checked', false );
        $('.cb_show_member_vote_only').attr('disabled', true);
    }
    else {
        $('.cb_show_member_vote_only').attr('disabled', false);
        var only = localStorage.getItem('cb_show_member_vote_only') || 0;

        $('.cb_show_member_vote_only').attr('checked', only == 1 ? true : false );
    }

    $('.cb_show_member_vote_only').change(function() {
        if( $(this).is(':checked') ) {
            localStorage.setItem('cb_show_member_vote_only', 1);
        }
        else {
            localStorage.setItem('cb_show_member_vote_only', 0);
        }
    })
}

Options.prototype.setSearchUserVoteOnly = function() {
    //  고정닉 투표만 보기 ( 손님투표 거르기 )
    if( !G.isLogin ) {
        $('.cb_show_search_user_vote_only').attr('checked', false );
        $('.cb_show_search_user_vote_only').attr('disabled', true);
    }
    else {
        $('.cb_show_search_user_vote_only').attr('disabled', false);
        var only = localStorage.getItem('cb_show_search_user_vote_only') || 0;

        $('.cb_show_search_user_vote_only').attr('checked', only == 1 ? true : false );
    }

    $('.cb_show_search_user_vote_only').change(function() {
        if( $(this).is(':checked') ) {
            localStorage.setItem('cb_show_search_user_vote_only', 1);
        }
        else {
            localStorage.setItem('cb_show_search_user_vote_only', 0);
        }
    })
}

Options.prototype.isShowMemberVoteOnly = function() {

    if($('.cb_show_member_vote_only').is(':checked')) {
        return true;
    }


    return false;
}

Options.prototype.isShowSearchUserVoteOnly = function() {

    if($('.cb_show_search_user_vote_only').is(':checked')) {
        return true;
    }


    return false;
}

Options.prototype.isMaxVoteDuplicateChecked = function() {

    if($('.cb_max_vote_duplicate').is(':checked')) {
        return true;
    }


    return false;
}

Options.prototype.isNotShowChat = function() {
    var checked = localStorage.getItem('cb_notshowchat') || 0;
    return checked == 1 ? true : false;
}

Options.prototype.isClearChatAuto = function() {
    var bDisable = localStorage.getItem('cb-notice-disable') || 0;
    return bDisable == 1 ? true : false;
}

var G = new GlobalValue();
var hintObj = new HintObject();
var chatObj = new ChatObject();
var voteObj = new VoteObject();
var searchObj = new SearchObject();
var topMenuObj = new TopMenuObject();
var chosungGameMan = new ChosungGameMan();
var quizObj = new QuizObject();
var options = new Options();

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
    var str = bModify == true ? G.stringTable['modify-hint-complete'] : G.stringTable['modify-hint'];
    this.btnModifyHint.text(str);

    if( bModify ) {
        CKEDITOR.instances['memo-area'].setData(this.articleArea.html().replace(/<br>/gi,'\n'));
    }
}

HintObject.prototype.sendHint = function() {
    var modifiedHint = CKEDITOR.instances['memo-area'].getData();
    //modifiedHint = modifiedHint.replace(/(?:\r\n|\r|\n)/g, '<br>');
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
    this.tLastFlushByInterval = 0;
    this.isFlushing = false;
    this.autoScrollElem = $('#cb_auto_scroll');
    this.cbNoticeDisable = $('#cb-notice-disable');
    this.tLastClear = 0;
}

ChatObject.prototype.init = function() {
    setInterval(function() {
        chatObj.bFlushByTimer = true;
        chatObj.FlushChat();
    }, 1000);
}

ChatObject.prototype.FlushChat = function( mode ) {
    try {
        var tCur = new Date();

        if ( mode == 'vote' || (chatObj.bFlushByTimer && !chatObj.isFlushing )) {
            chatObj.isFlushing = true;
            chatObj.bFlushByTimer = false;
            var bAutoMoveToBottom = false;
            var chatwndheight = chatObj.chatUI.height();

            var list = chatObj.chatUI.find('li');
            if (list.length > 35) {
                if( options.isClearChatAuto() ) {
                    chatObj.clearChat();
                }
                else {
                    list.eq(0).remove();
                }
            }

            if ((chatObj.chatUI.get(0).scrollTop == (chatObj.chatUI.get(0).scrollHeight - chatwndheight/* padding */) ) ||
                chatObj.autoScrollElem.is(':checked')) {
                bAutoMoveToBottom = true;
            }

            var html = '';
            for (var i = 0; i < chatObj.chatBuffer.length; ++i) {
                html += chatObj.chatBuffer[i];
            }

            chatObj.chatUI.append(html);

            //  끝 정렬
            if (bAutoMoveToBottom) {
                chatObj.chatUI.scrollTop(chatObj.chatUI.get(0).scrollHeight);
            }

            chatObj.chatBuffer = [];
            chatObj.isFlushing = false;
        }
    }
    catch(e) {

    }
}

ChatObject.prototype.clearChat = function() {
    chatObj.chatUI.empty();
}

ChatObject.prototype.addChat = function( mode, isbaned , nick, msg, bStrip,auth, ip, sockid ) {
    var li =    '<li mode="' + mode +'">' +
                    '<div class="chat-msg-item">' +
                        '<div class="nick-area">' +
                            '<div class="grade"><img src="' + getGradeImage(auth, isbaned) + '"></div>' +
                            '<div class="nick" ip="'+ ip +'" sockid="'+ sockid +'">' + nick + '</div>' +
                            (ip ? '<div class="ip">('+ ip + ')</div>' : '') +
                        '</div>' +
                        '<div class="msg-area">' +
                            msg +
                        '</div>' +
                    '</div>' +
                '</li>';

    this.chatBuffer.push(li);

    chatObj.FlushChat( mode );
}

ChatObject.prototype.setMsgVisible = function(mode, isVisible) {
    this.chatUI.find('li').each(function(idx) {
        if( $(this).attr('mode') == mode) {
            $(this).css('display', isVisible ? 'block' : 'none');
        }
    })
}

//  투표 관련 변수
function VoteObject() {
    this.tClick = 0;
}

VoteObject.prototype.vote = function(data) {
    data.nickname = getNickName();
    G.socket.emit('vote', data);
}

VoteObject.prototype.onVoteData = function(data) {
    searchObj.onSearchRetRank(data.searchlist, data.slhash);
    var votedata = data.vote_data;
    var users = votedata.users;
    G.connUserElem.text(users);
    G.banElem.text(votedata.bans);

    var total = [0,0,0];
    if( !options.isShowSearchUserVoteOnly() ) {
        for( var i = 0 ; i < votedata.cnt.length ; ++i ) {
            total[i] += votedata.cnt[i];
        }

        if( !options.isShowMemberVoteOnly() ) {
            for( var i = 0 ; i < votedata.guest_cnt.length ; ++i ) {
                total[i] += votedata.guest_cnt[i];
            }
        }
    }
    else {
        for( var i = 0 ; i < votedata.searched_cnt.length ; ++i ) {
            total[i] += votedata.searched_cnt[i];
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

    searchObj.totalCnt = totalCnt;

    var duplicatedMaxVoteCnt = 0;
    for( var i = 0 ; i < total.length ; ++i ) {
        if( maxVoteCnt == total[i] ) {
            duplicatedMaxVoteCnt++;
        }
    }

    if( options.isMaxVoteDuplicateChecked() && duplicatedMaxVoteCnt >= 2 ) {
        total = [0,0,0];
    }

    var minVoteVal = Number($('min_vote').text());

    if( totalCnt <= minVoteVal) {
        total = [0,0,0];
    }

    showBarChart('.ct-chart',['1번','2번','3번'],[total], {
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

function SearchObject() {
    this.lastSearchQuery = '';
    this.tLastRefresh = 0;
    this.timerID = 0;
    this.timerIDForDB = 0;
    this.area = [$('#search-area-left'), $('#search-area-center')];
    this.slhash = '';
    this.searchtop5queries = [];
    this.searchRank = $('#search-ret-rank-list');
    this.tLastSearch = 0;
    this.totalCnt = 0;
}

SearchObject.prototype.init = function() {
    for( var i = 0 ; i < this.area.length ; ++i ) {
        setVisible(this.area[i], false);
    }
}

SearchObject.prototype.initSearch = function() {
    for( var i = 0 ; i < this.area.length ; ++i ) {
        this.area[i].html('');
        setVisible(this.area[i], true);
    }
}

SearchObject.prototype.restoreSearch = function() {
    for( var i = 0 ; i < this.area.length ; ++i ) {
        this.area[i].html('');
        setVisible(this.area[i], false);
    }

    searchObj.lastSearchQuery = '';
}

SearchObject.prototype.onSearchRetRank = function( datalist, hash ) {

    var tCur = new Date();
    var searchRetRankList = searchObj.searchRank;

    var checked = localStorage.getItem('cb_searchTopFive') || 0;

    if( datalist.length <= 0 || checked == 0) {
        searchRetRankList.empty();
        searchObj.searchtop5queries = [];
        searchObj.slhash = '';
        setVisible($('#search-ret-rank'), false );
        return;
    }
    else {
        setVisible($('#search-ret-rank'), true );
    }

    if( hash != searchObj.slhash || tCur - searchObj.tLastRefresh > 1000 ) {
        searchObj.tLastRefresh = tCur;
        searchRetRankList.empty();
        searchObj.searchtop5queries = [];
        for( var i = 0 ; i < datalist.length ; ++i ) {
            var html = '<li class="btn-search-ret-rank">' + datalist[i].query + '</li>';
            searchRetRankList.append(html);
            searchObj.searchtop5queries.push(datalist[i].query);
        }

        searchObj.slhash = hash;


        var duplicateMap = new Map();

        var html = getSearchArea(1).html();
        var html2 = getSearchArea(2).html();

        var bChanged = false;
        for( var i = 0 ; i < datalist.length ; ++i ) {
            var words = datalist[i].query.split(' ');
            for( var w = 0 ; w < words.length ; ++w ) {
                if( searchObj.lastSearchQuery.indexOf(words[w]) != -1) continue;
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

function TopMenuObject() {
    this.btnLogin = $('#btn-login');
    this.btnLogin.click( onBtnLogin );
    this.btnLogout = $('#btn-logout');
    this.btnLogout.click( onBtnLogout );
    this.btnSignup = $('#btn-signup');
    this.btnSignup.click( onBtnSignup );
}

function onBtnLogin(e) {
    window.location.href = '/signin';
}

function onBtnSignup(e) {
    window.location.href = '/signup';
}

function onBtnLogout(e) {
    logout();
}

function QuizObject() {
    this.randomQuizRootElem = $('#random-quiz');
    this.jaumQuizRootElem = $('#jaum-quiz');
    this.questionElem = $('#random-quiz-question');
    this.answerElem = [ $('.random-quiz-answer').eq(0), $('.random-quiz-answer').eq(1), $('.random-quiz-answer').eq(2) ];
    this.gaugeElem = $('.gauge');
    this.providerElem = $('quiz-provider');
    this.quizWnd = $('#quiz-all-wnd');
    setVisibleBlock(this.quizWnd, false);
    this.bQuizEnable = true;
    this.quizData = null;
    this.tQuizStart = 0;
    this.intervalID = -1;
    this.btnToggleQuiz = $('#btn-toggle-quiz');
    this.btnToggleQuiz.click( onBtnToggleQuiz );
}

QuizObject.prototype.onQuiz = function(data) {
    if( !quizObj.bQuizEnable ) return;

    quizObj.quizData = data.quizdata;
    quizObj.questionElem.text(data.quizdata.question);

    quizObj.gaugeElem.css('width', '100%');
    quizObj.providerElem.text(data.nick);

    var html = '';
    for( var i = 0 ; i < quizObj.answerElem.length ; ++i ) {
        quizObj.answerElem[i].removeClass('qsel');

        var t = (i+1) + '. ' + data.quizdata.answer[i];
        html += (t + '</br>');
        quizObj.answerElem[i].text(t);
    }

    setVisibleBlock(quizObj.quizWnd, true);

    chatObj.addChat( "", false, '<div class="notice_font">퀴즈</div>', data.quizdata.question + '</br>' + html, false);

    quizObj.tStartQuiz = new Date();

    clearInterval(quizObj.intervalID);
    quizObj.intervalID = setInterval(function() {
        var remain = Math.floor((10000 - (Date.now() - quizObj.tStartQuiz)));
        if( remain <= 0 ) remain = 0;

        var percent = ( remain * 100 / 10000 ) + '%';
        quizObj.gaugeElem.css('width', percent);
        $('time').text(remain);
    }, 30);
}

QuizObject.prototype.onQuizRet = function( data ) {
    if( !quizObj.quizData ) return;
    if( !quizObj.bQuizEnable ) return;

    for( var i = 0 ; i < quizObj.answerElem.length ; ++i ) {
        if( data.collect_idx == i ) {
            quizObj.answerElem[i].addClass('qsel');
            var collect_rate = (data.collect_cnt / data.total_cnt) * 100.0;
            if( !collect_rate ) {
                collect_rate = 0;
            }
            chatObj.addChat( "", false, '<div class="notice_font">퀴즈 정답</div>', '<b><div style="color:' + color[i] + '">' + (i+1) + '번 '+ quizObj.quizData.answer[i]  + ' ( 정답률 : ' + collect_rate + '% )</div></b>', false);
        }
    }

    setTimeout(function() {
        clearInterval(quizObj.intervalID);
        setVisibleBlock(quizObj.quizWnd, false);
    }, 3000);
}

function setSocketEvent( socket ) {
    socket.on('chat', onChat );
    socket.on('memo', hintObj.onMemo );
    socket.on('serv_msg', onServMsg);
    socket.on('myid', onMyID);
    socket.on('vote_data', voteObj.onVoteData);
    socket.on('quiz', quizObj.onQuiz);
    socket.on('quizret', quizObj.onQuizRet);
    socket.on('next-quiz', G.onNextQuiz);
    socket.on('connect', connectStateInfo.Connect );
    socket.on('disconnect', connectStateInfo.Disconnect);
    socket.on('emoticon', onEmoticon);
    socket.on('update-user', onUpdateUser);
    socket.on('update-users', onUpdateUsers);
    socket.on('ap', onAP);
    socket.on('go', onGo);
    socket.on('chosung', chosungGameMan.onPacket);
    socket.on('reconn-server', function(data) {
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
        if( curTime - voteObj.tClick < 500 ) {
            return;
        }
        voteObj.tClick = curTime;

        var idx = code - 97;

        var nick = getNickName();
        var clicked = (idx+1);
        voteObj.vote({idx: idx });
    }
    else if( code == 37 || code == 40 || code == 39 ) {
        var idx = -1;
        if( code == 37 ) idx = 0;
        if( code == 40 ) idx = 1;
        if( code == 39 ) idx = 2;
        voteObj.vote({idx: idx });
    }
    else if( code >= 49 && code <= 55 ) {
        var idx = code - 49;
        if( searchObj.searchtop5queries.length <= idx ) {
            return;
        }

        searchWebRoot(G.socket, searchObj.searchtop5queries[idx], false);
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
            var query = msg.substr(1);
            searchWebRoot(G.socket, query, true);
            $(this).blur();
            return;
        }

        var isvote = -1;

        if( msg == "1") {
            voteObj.vote({idx:0});
            isvote = 0;
        }
        else if( msg == "2" ) {
            voteObj.vote({idx:1});
            isvote = 1;
        }
        else if( msg == "3") {
            voteObj.vote({idx:2});
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
    var settingsElem = $('wnd[role="settings"]');
    setVisible(settingsElem, false);
    $('#btn-settings').click(onBtnSettings);
    $('#btn-help').click(onBtnHelp);
    $('#notice-wrapper').click(function(e) {
        localStorage.setItem('notice-first', 1);
        setVisible($('#notice-wrapper'), false);
    });

    $('#btn-clear-chat').click(onClearChat);

    $('#btn-serv-1').click(onBtnGoServ1);
    $('#btn-serv-2').click(onBtnGoServ2);
    $('#btn-serv-3').click(onBtnGoServ3);
    $('#btn-serv-4').click(onBtnGoServ4);
    $('#btn-serv-5').click(onBtnGoServ5);

    $(document).on('click', '.btn-search-ret-rank', function(e) {
        e.stopPropagation();
        searchWebRoot(G.socket, $(this).text(), false);
    });

    $(document).on('click', '.nick-area .nick', function (e) {
        e.stopPropagation();
        openUserMenu($(this).text(), $(this).attr('sockid'), $(this).text().trim() );
        /*
         var name = $(this).text();
         if( confirm('신고가 모이면 이 아이피는 당분간 투표에 참여할 수 없습니다."' + name + '"를 신고하시겠습니까? ') ) {
         socket.emit('ban', {sockid: $(this).attr('sockid')});
         }
         */
        e.preventDefault();
    });

    $('#conn-users-list').on('click', '.btn-user-info', function (e) {
        openUserMenu($(this).text(), '', $(this).attr('nick') );
        e.preventDefault();
    });

    $('#um-ban').click(function(e) {
        e.stopPropagation();
        var user_menu = $('.user-menu');
        closeUserMenu();

        var name = user_menu.attr('nick');
        if( confirm('신고가 모이면 이 아이피는 당분간 투표에 참여할 수 없습니다."' + name + '"를 신고하시겠습니까? ') ) {
            G.socket.emit('ban', {sockid: user_menu.attr('sockid'), nick: user_menu.attr('nick')});
        }
        e.preventDefault();
    });

    $('#um-permanentban').click(function(e) {
        e.stopPropagation();
        var user_menu = $('.user-menu');
        closeUserMenu();
        G.socket.emit('permanentban', {sockid: user_menu.attr('sockid'), nick: user_menu.attr('nick')});
        e.preventDefault();
    });

    $('#um-like').click(function(e) {
        e.stopPropagation();
        var user_menu = $('.user-menu');
        closeUserMenu();
        G.socket.emit('like', {sockid: user_menu.attr('sockid'), nick: user_menu.attr('nick')});
        e.preventDefault();
    });

    $('#um-cancel').click(function(e) {
        e.stopPropagation();
        closeUserMenu()
        e.preventDefault();
    });
}

function onBtnGoServ1(e) { G.socket.emit('go', {servidx: '1'}) }
function onBtnGoServ2(e) { G.socket.emit('go', {servidx: '2'}) }
function onBtnGoServ3(e) { G.socket.emit('go', {servidx: '3'}) }
function onBtnGoServ4(e) { G.socket.emit('go', {servidx: '4'}) }
function onBtnGoServ5(e) { G.socket.emit('go', {servidx: '5'}) }

function onBtnSettings(e) {
    e.stopPropagation();
    var settingsWnd = $('wnd[role="settings"]');
    settingsWnd.css('display','inline-block');

    settingsWnd.css({left: 0});

    settingsWnd.click(function(e) {
        e.stopPropagation();
    })

    $(window).click(function() {
        settingsWnd.css({left: -300});
    })
}

function onBtnHelp(e) {
    e.stopPropagation();
    setVisible($('#notice-wrapper'), true);
}

function onClearChat(e) {
    chatObj.clearChat();
}

function onChat( data ) {
    if( data.mode == "vote" ) {
        if( data.isLogin ) {
            data.nickname = '<div class="logined_font">' + data.nickname + '</div>';
        }

        if( options.isShowMemberVoteOnly() &&
            ( (typeof data.auth == 'undefined') || (data.auth < 0 ) )
        ) {
            //chatObj.addChat( data.mode, data.isBaned, data.nickname, '<b>투표했습니다.</b>', false, data.auth, data.ip, data.sockid );
        }
        else if( options.isShowSearchUserVoteOnly() && !data.isSearched ) {
            //
        }
        else {
            chatObj.addChat( data.mode, data.isBaned, data.nickname, '<b style="color: '+ color[data.vote] + '">' + data.msg + '</b>', false, data.auth, data.ip, data.sockid);
        }
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
        if( options.isNotShowChat() ) return;
        if( data.admin ) {
            chatObj.addChat( data.mode, data.isBaned, '<div class="admin-nick">' + data.nickname + '</div>', '<div class="admin-nick">' + data.msg + '</div>', false, data.auth, data.ip, data.sockid);
        }
        else if( data.isLogin ) {
            chatObj.addChat( data.mode, data.isBaned, '<div class="logined_font">' + data.nickname + '</div>', data.msg, true, data.auth, data.ip, data.sockid);
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
    setVisible($('.admin-component'), data.auth >= 50);
    setNickName(data.nick);
    options.setShowMemberVoteOnly();
    options.setSearchUserVoteOnly();
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

function setVisibleBlock(elem, visible) {
    elem.css('display', visible ? 'block' : 'none');
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
        case 9:
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

function searchWebRoot( socket, query, isBroadcast ) {
    var tCur = new Date();
    if( tCur - searchObj.tLastSearch <= 500 ) {
        showAdminMsg('검색은 여유를 두고!');
        return;
    }

    if( query.length <= 1 ) {
        showAdminMsg('검색어는 2자 이상');
        return;
    }

    searchObj.tLastSearch = tCur;

    searchObj.initSearch();
    var nick = getNickName();
    socket.emit('search', {nickname: nick, msg: query, isBroadcast : isBroadcast });

    var queries = query.trim().split(' ');
    searchObj.lastSearchQuery = query;
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
    var where = $('input[name=radio_s0]:checked').attr('value');
    searchWeb(0, query, where);

    if( $('#cb_s5').is(':checked')) {
        var where = $('input[name=radio_s5]:checked').attr('value');
        searchWebGoogle(query, false, where);
        searched = true;
    } //  구글

    if( chinese ) {
        var where = $('input[name=radio_s7]:checked').attr('value');
        searchWebNaver(chienseQuery, chineseSubType, where);
        searched = true;
    }

    if( dongyo ) {
        searchWebDongyo(dongyoQuery, 2);
        searched = true;
    }

    if( $('#cb_s6').is(':checked')) {
        var where = $('input[name=radio_s6]:checked').attr('value');
        searchFromDB(query, where);
        searched = true;
    }
    if( !searched ) {
        //$('.search_article').html(htmlBackup);
        $('#sd_ret').css('display','none');
        $('#sd_ads').css('display','inline-block');
    }
}


var search_title_prefix = ['[백과사전]', '[지식인]', '[블로그]', '[뉴스]', '[이미지]','[다음(구글)]', '[백과사전]', '[백과사전]'];
var search_title_prefix_style_name = ['cb1', 'cb2', 'cb3', 'cb4', 'cb5', 'cb6', 'cb7', 'cb8'];
function searchWeb( type, query ) {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            query : query,
            type: type,
            sockid: G.sockid,
        }),
        contentType: 'application/json',
        url: '/searchex',
        success: function(data) {
            if( type != 4 ) {
                var itemMap = procSearchRet(data);
                for (var key of itemMap.keys()) {
                    var items = itemMap.get(key);
                    var isShow = getShow(key);
                    if( !isShow ) continue;
                    var where = getWhere(key);
                    setSearchRet(items, false, where, search_title_prefix[type], search_title_prefix_style_name[type]);
                }
            }
            else {
                setSearchRetImage(data, true, where);
            }
        }
    });
}

function getShow( key ) {
    //  웹 지식인 블로그 뉴스 포스트
    if( key == '웹' && $('#cb_s0').is(':checked')) {
        return true;
    } //  지식인

    if( key == '지식인' && $('#cb_s1').is(':checked')) {
        return true;
    } //  지식인

    if( key == '블로그' && $('#cb_s2').is(':checked')) {
        return true;
    } //  블로그

    if( key == '뉴스' && $('#cb_s3').is(':checked')) {
        return true;
    } //  뉴스

    if( key == '포스트') {
        return true;
    }

    return false;
}

function getWhere( key ) {
    var where = 1;
    if( key == '웹' ) {
        where = $('input[name=radio_s0]:checked').attr('value');
    }
    else if( key == '지식인') {
        where = $('input[name=radio_s1]:checked').attr('value');
    }
    else if( key == '블로그') {
        where = $('input[name=radio_s2]:checked').attr('value');
    }
    else if( key == '뉴스') {
        where = $('input[name=radio_s3]:checked').attr('value');
    }
    else if( key == '포스트') {
        where = 1;
    }

    return where;
}

function procSearchRet( items ) {
    //  뉴스 블로그 포스트 지식인 웹
    var map = new Map();
    for( var i = 0 ; i < items.length ; ++i) {
        var item = items[i];
        if( item.category && item.category != '' ) {
            if( map.containsKey(item.category) ) {
                var arr = map.get(item.category);
                arr.push(item);
            }
            else {
                map.put(item.category, []);
                var arr = map.get(item.category);
                arr.push(item);
            }
        }
    }

    var ret_cnt_val = localStorage.getItem('ret_cnt') || 3;
    for (var key of map.keys()) {
        var items = map.get(key);
        if( items && items.length > ret_cnt_val) {
            items = items.slice( 0, ret_cnt_val );
            map.put(key, items);
        }
    }

    return map;
}

function searchWebGoogle( query, grammer, where) {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            query : query,
            sockid: G.sockid,
            grammer : grammer
        }),
        contentType: 'application/json',
        url: '/searchgoogle',
        success: function(data) {
            setSearchRet(data, true, where, '[다음(구글)]', "cb6");
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
            sockid: G.sockid
        }),
        contentType: 'application/json',
        url: '/searchnaver',
        success: function(data) {
            try {
                if( data.data ) {
                    data.data = data.data.slice(0,2);
                }

                if( data.hdata ) {
                    data.hdata = data.hdata.slice(0,2);
                }

                if( data.edata ) {
                    data.edata = data.edata.slice(0,2);
                }
                setSearchRet(data.data, true, where, '[국어사전]', 'krdic');
                setSearchRet(data.hdata, true, where, '[한자사전]', 'hdic');
                setSearchRet(data.edata, true, where, '[영어사전]', 'edic');
            }catch( e ) {
                console.log(e);
                clearTimeout(searchObj.timerID);
                searchObj.timerID = setTimeout(function() {
                    searchObj.restoreSearch();
                }, 13000);
            }
        }
    });
}

function searchWebDongyo(query , where) {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            query : query,
            sockid: G.sockid
        }),
        contentType: 'application/json',
        url: '/searchdongyo',
        success: function(data) {
            try {
                data.data = data.data.slice(0,2);
                setSearchRet(data.data, true, where, '[동요]', 'dongyo');
            }catch(e) {
                console.log(e);
                clearTimeout(searchObj.timerID);
                searchObj.timerID = setTimeout(function() {
                    searchObj.restoreSearch();
                }, 13000);
            }
        }
    });
}


function searchFromDB( query, where ) {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            query : query,
            sockid: G.sockid
        }),
        contentType: 'application/json',
        url: '/searchdb',
        success: function(data) {
            setSearchDB(data, where);
        }
    });
}

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

    clearTimeout(searchObj.timerIDForDB);
    searchObj.timerIDForDB = setTimeout(function() {
        //$('.search_article').html(htmlBackup);
        searchObj.restoreSearch();
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

    clearTimeout(searchObj.timerID);
    searchObj.timerID = setTimeout(function() {
        //$('.search_article').html(htmlBackup);
        searchObj.restoreSearch();
    }, 15000);
}

function setSearchRet(items, first, where, title_prefix, title_prefix_style) {
    try {
        title_prefix = '<title-prefix class="'+ title_prefix_style + '">' + title_prefix + '</title-prefix>';

        var html = '';
        for( var i = 0 ; i < items.length ; ++i) {
            var item = items[i];
            if( item.category && item.category != '') {
                title_prefix = '<title-prefix class="title-prefix-ex">[' + item.category + ']</title-prefix>';
            }
            var hidx = item.description.indexOf('[총획]');
            var hidxend = item.description.indexOf('[난이도]');
            if( hidxend == -1 ) hidxend = hidx + 20;
            var hinfo = '<b>' + item.description.slice(hidx, hidxend).trim() + '</b>';
            var div = '<div class="search_ret_root">' +
                '<div class="search_ret_title">' +
                title_prefix + ' ' + item.title + ' ' + hinfo +
                '</div><div class="search_ret_desc">' +
                (item.description) +
                '</div><div class="separator"></div>' +
                '</div>';

            html += div;
        }

        if( items.length == 0 ) {
            //html = '<div style="text-align:center;">검색 결과가 없습니다. 좀 더 신중한 검색!</div>';
        }
        if( first ) {
            getSearchArea(where).prepend(html);
        }
        else {
            getSearchArea(where).append(html);
        }
    }
    catch(e) {

    }

    clearTimeout(searchObj.timerID);
    searchObj.timerID = setTimeout(function() {
        searchObj.restoreSearch();
    }, 13000);
}

function getSearchArea(where) {
    if( where == 1 ) {
        return searchObj.area[0];
    }
    else {
        return searchObj.area[1];
    }
}

function onEmoticon(_data) {
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
    }
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

function onBtnToggleQuiz(e) {
    e.stopPropagation();

    setVisibleBlock(quizObj.quizWnd, false);
    clearInterval(quizObj.intervalID);

    quizObj.bQuizEnable = !quizObj.bQuizEnable;
    $('#btn-toggle-quiz').text(quizObj.bQuizEnable ? G.stringTable['quiz-off'] : G.stringTable['quiz-on']);
}

function updateUserList() {
    var tCur = new Date();
    if( tCur - G.tLastUserUpdate < 5000 ) {
        return;
    }
    G.tLastUserUpdate = tCur;

    var html = '';
    var keys = G.usersMap.keys();
    keys.sort();
    for( var i = 0 ; i < keys.length ; ++i ) {
        html += '<li><div class="btn-user-info" nick="'+ keys[i] +'" >'+ keys[i] + '</div></li>';
    }
    G.connUserList.html(html);
}


function onUpdateUser(data) {
    if( data.op == 'add') {
        G.usersMap.put(data.nick, 1);
    }
    else {
        G.usersMap.remove(data.nick);
    }

    updateUserList();
}

function onAP(data) {
    $('ap').text(data.ap + ' 점');
}

function onGo(data) {
    if( data.ret == 0 ) {
        window.location.href = data.url;
    }
    else {
        showAdminMsg(data.msg);
    }
}

function onUpdateUsers(data) {
    for( var i = 0 ; i < data.list.length ; ++i) {
        G.usersMap.put(data.list[i], 1);
    }

    updateUserList();
}