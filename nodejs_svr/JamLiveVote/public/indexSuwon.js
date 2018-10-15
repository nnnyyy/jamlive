/**
 * Created by nnnyy on 2018-08-10.
 */

var RETRY_INTERVAL = 4000;
var ConnectStateInfo = function() {
    this.isConnected = false;
    this.timeoutID = -1;
}
var connectStateInfo = new ConnectStateInfo();

function AjaxHelper() {

}

AjaxHelper.prototype.postJson = function( url, jsondata, cbSuccess ) {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify(jsondata),
        contentType: 'application/json',
        url: url,
        success: cbSuccess
    });
}


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
    siteMenu.init();
    chosungGameMan.init();
    setSocketEvent(socket);
    setKeyEvent();
    setBtnEvent();

    $('#slider').bxSlider({
        auto: true,
        speed: 500,
        pause: 7000,
        mode:'fade',
        autoControls: false,
        pager: false
    });

    chatObj.vSearchVoteList.visible = false;
}

var GlobalValue = function() {
    this.socket = null;
    this.sockid = '';
    this.isLogin = false;
    this.connUserElem = $('#conn-cnt');
    this.totalConnUserElem = $('#total-conn-cnt');
    //this.banElem = $('#ban-cnt');
    //this.weekdayElem = $('next-quizday');
    this.quizinfoElem = $('next-quiz-info');
    this.usersMap = new Map();
    this.connUserList = $('#conn-users-list');
    this.tLastUserUpdate = 0;
    this.auth = -1;
    this.vUserInfo = new Vue({
        el: '#area-top-right',
        data: {
            ap: -1
        }
    });
}

function ChosungGameMan() {
    this.questionTypeName = ['사전', '음식', '관용표현', '해산물', '날씨', '식물', '영화-주인공', '나루토', '과일', '화가', '장소', '한국영화'];
    this.questionType = 0;
}

ChosungGameMan.prototype.init = function() {
    setVisibleBlock(quizObj.randomQuizRootElem, false);
    setVisibleBlock(quizObj.jaumQuizRootElem, false);
    setVisibleBlock(quizObj.centerVideoElem, true);
}

ChosungGameMan.prototype.setUI = function() {
    setVisibleBlock(quizObj.randomQuizRootElem, false);
    setVisibleBlock(quizObj.centerVideoElem, false);
    setVisibleBlock(quizObj.jaumQuizRootElem, true);
}

ChosungGameMan.prototype.closeUI = function() {
    setVisibleBlock(quizObj.randomQuizRootElem, false);
    setVisibleBlock(quizObj.jaumQuizRootElem, false);
    setVisibleBlock(quizObj.centerVideoElem, true);
}

ChosungGameMan.prototype.setText = function(word) {
    $('jaum-notice').text(word);
}

ChosungGameMan.prototype.onPacket = function( packet ) {
    stopVideo();

    var item = {
        mode: 'chat',
        auth: 99,
        isBaned: false,
        sockid: '',
        ip: '',
        nick: '초성',
        msg: '',
        isAdmin: false,
        vote: 0
    }

    if( packet.step == 'start' ) {
        chosungGameMan.setText('#### 곧 초성게임이 시작 됩니다! ####');
        chosungGameMan.setUI();
    }
    else if( packet.step == 'q') {
        item.msg = '새로운 문제가 출제 되었습니다 - ' + packet.q;
        chatObj.addChat( item );
        if( packet.prev_q ) {
            showAdminMsg('정답은 ' + packet.prev_q + '였습니다');
        }

        var typeName = '';
        if( packet.type == -1  ) {

        }
        else {
            chosungGameMan.questionType = packet.type;
            typeName = '[' + chosungGameMan.questionTypeName[chosungGameMan.questionType] + ']';
        }


        chosungGameMan.setText(typeName + packet.q);
    }
    else if( packet.step == 'msg' ) {
        item.msg = packet.msg;
        chatObj.addChat( item );
    }
    else if( packet.step == 'result' ) {
        item.msg = '퀴즈가 종료 되었습니다';
        chatObj.addChat( item );
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
        item.msg = '힌트가 도착했습니다';
        chatObj.addChat( item );

        if( packet.mode == 1 ) {
            chosungGameMan.questionType = packet.type;
            var typeName = chosungGameMan.questionTypeName[chosungGameMan.questionType];
            chosungGameMan.setText('[' + typeName + '] ' + packet.q);
        }
        else {
            var typeName = chosungGameMan.questionTypeName[chosungGameMan.questionType];
            chosungGameMan.setText('[' + typeName + '] ' + packet.q);
        }
    }
    else if( packet.step == 'fail') {
        var msg = '실패 했습니다! 답은 ' + packet.q;
        item.msg = msg;
        chatObj.addChat( item );
        showAdminMsg(msg);
    }
}

function SiteMenu() {

}

SiteMenu.prototype.init = function() {
    this.vMenu = new Vue({
        el: '#site-menu',
        data: {
            visible: false,
            btnStyle: {
                cursor: 'pointer'
            },
            btnStyleKin: {
                cursor: 'pointer',
                color: '#098100',
                fontWeight: 'bold'
            },
            isAdminMembers: false
        },
        methods: {
            onMouseLeave: function(e) {
                this.visible = false;
            },
            onBtnLogin: function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = '/signin';
            },
            onBtnSignUp: function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = '/signup';
            },
            onBtnLogout: function(e) {
                e.preventDefault();
                e.stopPropagation();
                logout();
            },
            onBtnKin: function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.open('/kin','_blank');
            },
            onBtnCafe: function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.open('https://cafe.naver.com/livequizshare','_blank');
            },
            onBtnQuizSite: function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.open('http://quiz.jamlive.net/','_blank');
            },
            onBtnHelp: function(e) {
                e.preventDefault();
                e.stopPropagation();
                this.visible = false;
                siteMenu.vHelp.visible = true;
            },
            onBtnAdminMode: function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.open('http://databucket.duckdns.org:7777','_blank');
            },
            onBtnSetQuizMode: function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.open('/quizSet/','_blank');
            }
        }
    })

    this.vHelp = new Vue({
        el: '#help',
        data: {
            visible: false
        },
        methods: {
            onClick: function(e) {
                this.visible = false;
            }
        }
    });
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
    this.setShowHighLevelVoteOnly();

    //  투표 몇 표 이상일 경우 보여줄까?
    var min_vote_val = localStorage.getItem('min_vote') || 0;
    $('.min_vote_slider').slider({
        range: "min",
        value: 0,
        min: 0,
        max: 10,
        slide: function( event, ui ) {
            localStorage.setItem('min_vote', ui.value);
            $( ".min_vote" ).text( ui.value );
        }
    });

    $('.min_vote_slider').slider('value', min_vote_val);
    $( ".min_vote" ).text( min_vote_val );


    //  결과 몇개까지 보여줄까?
    var ret_cnt_val = localStorage.getItem('ret_cnt') || 3;
    $('.ret_cnt_slider').slider({
        range: "min",
        value: 3,
        min: 1,
        max: 4,
        slide: function( event, ui ) {
            localStorage.setItem('ret_cnt', ui.value);
            $( ".ret_cnt" ).text( ui.value );
        }
    });

    $('.ret_cnt_slider').slider('value', ret_cnt_val);
    $( ".ret_cnt" ).text( ret_cnt_val );

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

    //  전체 서버 결과 보기
    checked = localStorage.getItem('cb-show-all-server-vote') || 0;
    $('#cb-show-all-server-vote').attr('checked', checked == 1 ? true : false);
    $('#cb-show-all-server-vote').change(function() {
        if( $(this).is(':checked') ) {
            if( G.auth < 4 ) {
                $('#cb-show-all-server-vote').prop('checked', false);
                showAdminMsg('레벨 4 미만은 사용 불가능합니다.');
                return;
            }
            localStorage.setItem('cb-show-all-server-vote', 1);
        }
        else {
            localStorage.setItem('cb-show-all-server-vote', 0);
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

    var storageData = localStorage.getItem(options.vSettings.autoScroll.storage) || 0;
    options.vSettings.autoScroll.checked = storageData == 1 ? true : false;

    storageData = localStorage.getItem(options.vSettings.arrowVote.storage) || 0;
    options.vSettings.arrowVote.checked = storageData == 1 ? true : false;

    storageData = localStorage.getItem(options.vSettings.duplVoteNotShow.storage) || 0;
    options.vSettings.duplVoteNotShow.checked = storageData == 1 ? true : false;

    storageData = localStorage.getItem(options.vSettings.showOtherSearch.storage) || 0;
    options.vSettings.showOtherSearch.checked = storageData == 1 ? true : false;


    // 검색 옵션
    var searchOptionList = [
        options.vSettings.search.localDB,
        options.vSettings.search.naverImage,
        options.vSettings.search.daum,
        options.vSettings.search.dicKor,
        options.vSettings.search.dicEng,
        options.vSettings.search.dicHan,
        options.vSettings.search.naverEncyc,
        options.vSettings.search.naverWeb,
        options.vSettings.search.naverNews,
        options.vSettings.search.naverKin,
        options.vSettings.search.naverBlog
    ]

    for( var i = 0 ; i < searchOptionList.length ; ++i ) {
        var item = searchOptionList[i];
        var storageData = localStorage.getItem(item.storage) || 0;
        item.checked = storageData == 1 ? true : false;
        storageData = localStorage.getItem(item.rStorage) || 1;
        item.where = storageData;
    }
}

Options.prototype.initSettings = function() {
    this.vSettings = new Vue({
        el: '#settings',
        data: {
            visible: false,
            arrowVote: {
                disabled: false,
                checked: false,
                storage: 'arrowVote'
            },
            duplVoteNotShow: {
                disabled: false,
                checked: false,
                storage: 'duplVoteNotshow'
            },
            showHighLevelVoteOnly: {
                disabled: false,
                checked: false,
                storage: 'showHighLevelVoteOnly'
            },
            autoScroll: {
                checked: true,
                storage: 'autoScroll'
            },
            showOtherSearch: {
                disabled: false,
                checked: false,
                storage: 'showOtherSearch'
            },
            search: {
                localDB: {
                    disabled: false,
                    checked: true,
                    storage: 'localDB',
                    where: 1,
                    rStorage: 'localDBR'
                },
                naverImage: {
                    disabled: false,
                    checked: true,
                    storage: 'naverImage',
                    where: 1,
                    rStorage: 'naverImageR'
                },
                daum: {
                    disabled: false,
                    checked: false,
                    storage: 'daum',
                    where: 1,
                    rStorage: 'daumR'
                },
                dicEng: {
                    disabled: false,
                    checked: true,
                    storage: 'dicEng',
                    where: 2,
                    rStorage: 'dicEngR'
                },
                dicKor: {
                    disabled: false,
                    checked: true,
                    storage: 'dicKor',
                    where: 2,
                    rStorage: 'dicKorR'
                },
                dicHan: {
                    disabled: false,
                    checked: false,
                    storage: 'dicHan',
                    where: 1,
                    rStorage: 'dicHanR'
                },
                naverEncyc: {   //  백과사전
                    disabled: false,
                    checked: true,
                    storage: 'naverEncyc',
                    where: 2,
                    rStorage: 'naverEncycR'
                },
                naverWeb: {   //  웹
                    disabled: false,
                    checked: true,
                    storage: 'naverWeb',
                    where: 1,
                    rStorage: 'naverWebR'
                },
                naverNews: {   //  뉴스
                    disabled: false,
                    checked: true,
                    storage: 'naverNews',
                    where: 1,
                    rStorage: 'naverNewsR'
                },
                naverKin: {   //  지식인
                    disabled: false,
                    checked: false,
                    storage: 'naverKin',
                    where: 1,
                    rStorage: 'naverKinR'
                },
                naverBlog: {   //  지식인
                    disabled: false,
                    checked: false,
                    storage: 'naverBlog',
                    where: 1,
                    rStorage: 'naverBlogR'
                }
            }
        },
        methods: {
            onChange: function(localStorageName, obj, event) {
                if( event.target.checked === true) {
                    obj.checked = true;
                    localStorage.setItem(localStorageName, 1);
                }
                else {
                    obj.checked = false;
                    localStorage.setItem(localStorageName, 0);
                }
            },
            onRadioChange: function( item ) {
                localStorage.setItem(item.rStorage, item.where);
            },
            onMouseLeave: function(e) {
                this.visible =false;
            }
        }
    });

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

Options.prototype.setShowHighLevelVoteOnly = function() {
    if( !G.isLogin ) {
        options.vSettings.showHighLevelVoteOnly.disabled = true;
        options.vSettings.showHighLevelVoteOnly.checked = false;
    }
    else {
        options.vSettings.showHighLevelVoteOnly.disabled = false;
        var storageData = localStorage.getItem(options.vSettings.showHighLevelVoteOnly.storage) || 0;
        options.vSettings.showHighLevelVoteOnly.checked = storageData == 1 ? true : false;
    }
}

Options.prototype.setSearchOptions = function() {
    var searchOptionList = [
        options.vSettings.search.naverEncyc,
        options.vSettings.search.naverWeb,
        options.vSettings.search.naverNews,
        options.vSettings.search.naverKin,
        options.vSettings.search.naverBlog
    ]

    if( G.auth < 4 ) {
        for( var i = 0 ; i < searchOptionList.length ; ++i ) {
            var item = searchOptionList[i];
            item.checked = false;
            item.disabled = true;
        }
    }
}

Options.prototype.isShowMemberVoteOnly = function() {

    if($('.cb_show_member_vote_only').is(':checked')) {
        return true;
    }


    return false;
}

Options.prototype.isShowSearchUserVoteOnly = function() {
    return options.vSettings.showHighLevelVoteOnly.checked;
}

Options.prototype.isMaxVoteDuplicateChecked = function() {
    return options.vSettings.duplVoteNotShow.checked;
}

Options.prototype.isAbleArrowVote = function() {
    return options.vSettings.arrowVote.checked;
}

Options.prototype.isNotShowChat = function() {
    var checked = localStorage.getItem('cb_notshowchat') || 0;
    return checked == 1 ? true : false;
}

Options.prototype.isShowAllServerVote = function() {
    var checked = localStorage.getItem('cb-show-all-server-vote') || 0;
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
var siteMenu = new SiteMenu();

//  힌트 관련 변수
function HintObject() {
    this.modifyTextArea = $('.memo-area');
    this.bModifyMode = false;

    this.vHintRoot = new Vue({
        el: '#hint',
        data: {
            type: 'global',
            isModify: true,
            hintProvider: '',
            sBtnModifyHintTitle: '수정하기',
            globalTab: {
                style: {
                    float: 'left',
                    cursor: 'pointer',
                    padding: '0 8px',
                    backgroundColor: '#DE5B49',
                    fontWeight: 'bold',
                    opacity: 1
                },
                articleArea: {
                    provider: '',
                    visible: false,
                    html: ''
                }
            },
            localTab: {
                style: {
                    float: 'left',
                    cursor: 'pointer',
                    padding: '0 8px',
                    backgroundColor: '#3AA84B',
                    fontWeight: 'normal',
                    opacity: 0.5
                },
                articleArea: {
                    provider: '',
                    visible: true,
                    html: ''
                }
            },
            btnCancel: {
                visible: false
            }
        },
        methods: {
            onBtnModifyHint: onBtnModifyHint,
            onBtnModifyHintCancel: onBtnModifyHintCancel,
            getCurTypeHtml: function() {
                return this.type == 'global' ? this.globalTab.articleArea.html : this.localTab.articleArea.html;
            },
            onBtnGlobal: function(e) {
                if( this.isModify ) return;
                this.hintProvider = this.globalTab.articleArea.provider;
                this.type = 'global';
                this.globalTab.style.fontWeight = 'bold';
                this.globalTab.style.opacity = 1;
                this.localTab.style.fontWeight = 'normal';
                this.localTab.style.opacity = 0.5;
            },
            onBtnLocal: function(e) {
                if( this.isModify ) return;
                this.hintProvider = this.localTab.articleArea.provider;
                this.type = 'local';
                this.globalTab.style.fontWeight = 'normal';
                this.globalTab.style.opacity = 0.5;
                this.localTab.style.fontWeight = 'bold';
                this.localTab.style.opacity = 1;
            }
        }
    });
}

HintObject.prototype.init = function() {
    this.setHintMode( false );
    this.updateHint();
}

HintObject.prototype.setHintMode = function( bModify ) {
    this.vHintRoot.isModify = bModify;
    this.bModifyMode = bModify;
    var str = bModify == true ? G.stringTable['modify-hint-complete'] : G.stringTable['modify-hint'];
    this.vHintRoot.sBtnModifyHintTitle = str;

    var html = this.vHintRoot.getCurTypeHtml().replace(/<br>/gi,'\n');
    if( bModify ) {
        CKEDITOR.instances['memo-area'].setData(html);
    }
}

HintObject.prototype.sendHint = function() {
    var modifiedHint = CKEDITOR.instances['memo-area'].getData();
    var hintType = this.vHintRoot.type;
    //modifiedHint = modifiedHint.replace(/(?:\r\n|\r|\n)/g, '<br>');
    G.socket.emit('memo', {type: hintType, mode:'set', memo: modifiedHint });
}

HintObject.prototype.sendIsUsableHint = function() {
    var hintType = this.vHintRoot.type;
    G.socket.emit('memo', {type: hintType, mode: 'isUsable' });
}

HintObject.prototype.sendCancel = function() {
    var hintType = this.vHintRoot.type;
    G.socket.emit('memo', {type: hintType, mode: 'cancel' });
}

HintObject.prototype.updateHint = function() {
    if( this.vHintRoot.type == 'global' ) {
        this.vHintRoot.hintProvider = this.vHintRoot.globalTab.articleArea.provider;
    }
    else {
        this.vHintRoot.hintProvider = this.vHintRoot.localTab.articleArea.provider;
    }
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
        hintObj.vHintRoot.localTab.articleArea.html = data.local.hint;
        hintObj.vHintRoot.localTab.articleArea.provider = data.local.provider;
        hintObj.setHintMode(false);
        hintObj.updateHint();
    }
}

HintObject.prototype.onGlobalHint = function( packet ) {
    if( packet.mode == 'isUsable') {
        if( packet.isAble == true ) {
            hintObj.setHintMode( true );
        }
    }
    else if ( packet.mode == 'cancel' ) {
        hintObj.setHintMode( false );
    }
    else if ( packet.mode == 'set') {
        hintObj.vHintRoot.globalTab.articleArea.html = packet.global.hint;
        hintObj.vHintRoot.globalTab.articleArea.provider = packet.global.provider;
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
    this.cbNoticeDisable = $('#cb-notice-disable');
    this.tLastClear = 0;

    this.vSearchVoteList = new Vue({
        el: '#vote-list',
        data: {
            isScroll: false,
            visible: false,
            sTitle: '투표자',
            listHtml:''
        }
    });

    this.vChat = new Vue({
        el: '#chat',
        data: {
            chatMsgList: [
            ]
        },
        methods: {
            grade: getGradeImage,
            ip: function(ip) {
                if( ip ) {
                    var aIpSplited = ip.split('.');
                    if( aIpSplited.length >= 4 ) {
                        aIpSplited[3] = 'xx';
                        ip = aIpSplited.join('.');
                    }
                }
                return '(' + ip + ')';
            },
            getMsgStyle: function(item) {
                if( item.mode != 'vote' ) {
                    return {};
                }
                else {
                    var style =
                    {
                        color: (item.vote == -1) ? 'black' : color[item.vote]
                    };

                    return style;
                }
            },
            getIpStyle: function(item) {
                if( item.mode != 'chat' || item.vote == -1 ) {
                    return {};
                }
                else {
                    var style =
                    {
                        color: (item.vote == -1) ? 'black' : color[item.vote],
                        fontWeight: 'bold'
                    };

                    return style;
                }
            },
            checkScroll: function(bForced) {
                var container = document.querySelector(".chat-ui");
                var scrollHeight = container.scrollHeight;
                if( container.scrollTop == ( scrollHeight - container.clientHeight ) || bForced ) {
                    this.isScroll = true;
                }
            },
            scrollToEnd: function() {
                var container = document.querySelector(".chat-ui");
                var scrollHeight = container.scrollHeight;

                if( this.isScroll ) {
                    container.scrollTop = scrollHeight;
                    this.isScroll = false;
                }
            }
        },
        mounted: function() {
            this.scrollToEnd();
        },
        updated: function() {
            this.scrollToEnd();
        }
    })
}

ChatObject.prototype.init = function() {
    setInterval(function() {
        chatObj.bFlushByTimer = true;
        chatObj.FlushChat();
    }, 1000);
}

ChatObject.prototype.FlushChat = function( mode ) {
    try {
        if ( mode == 'vote' || (chatObj.bFlushByTimer && !chatObj.isFlushing )) {
            chatObj.isFlushing = true;
            chatObj.bFlushByTimer = false;

            var list = chatObj.vChat.chatMsgList;
            if (list.length > 35) {
                if( options.isClearChatAuto() ) {
                    chatObj.clearChat();
                }
                else {
                    chatObj.vChat.chatMsgList.shift();
                }
            }

            chatObj.vChat.checkScroll( options.vSettings.autoScroll.checked );

            chatObj.vChat.chatMsgList = chatObj.vChat.chatMsgList.concat( chatObj.chatBuffer );

            chatObj.chatBuffer = [];
            chatObj.isFlushing = false;
        }
    }
    catch(e) {

    }
}

ChatObject.prototype.clearChat = function() {
    chatObj.vChat.chatMsgList = [];
}

ChatObject.prototype.addChat = function( item ) {
    this.chatBuffer.push(item);

    chatObj.FlushChat( item.mode );
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
    this.kinlist = [];
    this.tClick = 0;
}

VoteObject.prototype.vote = function(data) {
    data.nickname = getNickName();
    G.socket.emit('vote', data);
}

VoteObject.prototype.onVoteData = function(data) {
    searchObj.onSearchRetRank(data.searchlist, data.slhash);
    var votedata = data.vote_data;
    voteObj.kinlist = data.kin;
    showKin(data.searchlist);
    var users = votedata.users;
    G.connUserElem.text(users);
    G.totalConnUserElem.text(votedata.totalCnt);
    //G.banElem.text(votedata.bans);

    var total = [0,0,0,0];

    //  상위 레벨 투표 결과
    for( var i = 0 ; i < votedata.searched_cnt.length ; ++i ) {
        total[i] += votedata.searched_cnt[i];
    }


    if( !options.isShowSearchUserVoteOnly() ) {
        //  일반 레벨 (로그인한) 투표 결과
        for( var i = 0 ; i < votedata.cnt.length ; ++i ) {
            total[i] += votedata.cnt[i];
        }
    }

    if( options.isShowAllServerVote() ) {
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

    searchObj.totalCnt = totalCnt;

    var duplicatedMaxVoteCnt = 0;
    for( var i = 0 ; i < total.length ; ++i ) {
        if( maxVoteCnt == total[i] ) {
            duplicatedMaxVoteCnt++;
        }
    }

    if( options.isMaxVoteDuplicateChecked() && duplicatedMaxVoteCnt >= 2 ) {
        total = [0,0,0,0];
    }

    var minVoteVal = Number($('.min_vote').text());

    if( totalCnt <= minVoteVal) {
        total = [0,0,0,0];
    }

    showBarChart('.ct-chart',['1번','2번','3번', '4번'],[total], {
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
    this.isRunning = false;
    this.isKinModifying = false;
    this.duplicateMap = new Map();

    this.vSearchAreaCenter = new Vue({
        el: '#search-area-center',
        data: {
            visible: false,
            kinHtml: '',
            articles: [
            ]
        }
    })

    this.vSearchAreaLeft = new Vue({
        el: '#search-area-left',
        data: {
            visible: false,
            articles: [
            ]
        }
    })
}

SearchObject.prototype.init = function() {
    searchObj.vSearchAreaCenter.visible = false;
    searchObj.vSearchAreaLeft.visible = false;
}

SearchObject.prototype.initSearch = function() {
    searchObj.vSearchAreaCenter.articles.splice(0);
    searchObj.vSearchAreaLeft.articles.splice(0);
    searchObj.vSearchAreaCenter.visible = true;
    searchObj.vSearchAreaLeft.visible = true;

    searchObj.isRunning = true;
}

SearchObject.prototype.restoreSearch = function() {
    searchObj.vSearchAreaCenter.visible = false;
    searchObj.vSearchAreaLeft.visible = false;

    searchObj.lastSearchQuery = '';
    searchObj.isRunning = false;
}

SearchObject.prototype.onSearchRetRank = function( datalist, hash ) {

    var tCur = new Date();
    var searchRetRankList = searchObj.searchRank;

    var checked = options.vSettings.showOtherSearch.checked;

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

    if( hash != searchObj.slhash || tCur - searchObj.tLastRefresh > 500 ) {
        searchObj.tLastRefresh = tCur;
        searchRetRankList.empty();
        searchObj.searchtop5queries = [];
        for( var i = 0 ; i < datalist.length ; ++i ) {
            var html = '<li class="btn-search-ret-rank">' + datalist[i].query + '</li>';
            searchRetRankList.append(html);
            searchObj.searchtop5queries.push(datalist[i].query);
        }

        searchObj.slhash = hash;

        var bChanged = false;
        for( var i = 0 ; i < datalist.length ; ++i ) {
            var words = datalist[i].query.split(' ');
            for( var w = 0 ; w < words.length ; ++w ) {
                if( searchObj.lastSearchQuery.indexOf(words[w]) != -1) continue;
                if( '<search-top-ret>'.indexOf(words[w]) != -1) continue;

                var exp = new RegExp(words[w], "gi");

                for( var sai = 1 ; sai <= 2 ; ++sai ) {
                    var articles = getSearchArea(sai).articles;

                    for( var ia = 0 ; ia < articles.length ; ++ ia ) {
                        if( articles[ia].except ) continue;
                        var item = {title: articles[ia].title, desc: articles[ia].desc, usedKeyword: articles[ia].usedKeyword };
                        if( item.usedKeyword ) {
                            if( item.usedKeyword.indexOf(words[w]) != -1 ) {
                                continue;
                            }
                        }
                        item.title = item.title.replace( exp, '<search-top-ret>' + words[w] + '</search-top-ret>');
                        item.desc = item.desc.replace( exp, '<search-top-ret>' + words[w] + '</search-top-ret>');
                        if( !item.usedKeyword ) {
                            item.usedKeyword = [];
                        }
                        item.usedKeyword.push(words[w]);

                        articles.splice(ia, 1, item);
                    }
                }

                searchObj.duplicateMap.put(words[w], 1);
                bChanged = true;
            }
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
    e.stopPropagation();
    window.location.href = '/signin';
}

function onBtnSignup(e) {
    e.stopPropagation();
    window.location.href = '/signup';
}

function onBtnLogout(e) {
    e.stopPropagation();
    logout();
}

function QuizObject() {
    this.randomQuizRootElem = $('#random-quiz');
    this.jaumQuizRootElem = $('#jaum-quiz');
    this.centerVideoElem = $('#video-ads-area');
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

    stopVideo();

    setVisibleBlock( quizObj.centerVideoElem, false );
    setVisibleBlock( quizObj.randomQuizRootElem, true );

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

    var item = {
        mode: 'quiz',
        auth: 99,
        isBaned: false,
        sockid: '',
        ip: '',
        nick: '퀴즈',
        msg: data.quizdata.question + '</br>' + html,
        isAdmin: data.admin,
        vote: data.vote
    }

    chatObj.addChat( item );

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
            var item = {
                mode: 'quiz',
                auth: 99,
                isBaned: false,
                sockid: '',
                ip: '',
                nick: '퀴즈정답',
                msg: '<b><div style="color:' + color[i] + '">' + (i+1) + '번 '+ quizObj.quizData.answer[i]  + ' ( 정답률 : ' + collect_rate + '% )</div></b>',
                isAdmin: data.admin,
                vote: data.vote
            }

            chatObj.addChat( item );
            setTimeout(function() {
                setVisibleBlock( quizObj.centerVideoElem, true );
                setVisibleBlock( quizObj.randomQuizRootElem, false );
            }, 3000);
        }
    }

    setTimeout(function() {
        clearInterval(quizObj.intervalID);
        setVisibleBlock(quizObj.quizWnd, false);
    }, 3000);
}

function setSocketEvent( socket ) {
    socket.on('chat', onChat );
    socket.on('admin-msg', onAdminMsg);
    socket.on('memo', hintObj.onMemo );
    socket.on('serv_msg', onServMsg);
    socket.on('loginInfo', onLoginInfo);
    socket.on('update-info', onUpdateInfo);
    socket.on('get-vote-list', onGetVoteListResult);
    socket.on('get-search-list', onGetSearchListResult);
    socket.on('vote_data', voteObj.onVoteData);
    socket.on('quiz', quizObj.onQuiz);
    socket.on('quizret', quizObj.onQuizRet);
    //socket.on('next-quiz', G.onNextQuiz);
    socket.on('connect', connectStateInfo.Connect );
    socket.on('disconnect', connectStateInfo.Disconnect);
    socket.on('emoticon', onEmoticon);
    socket.on('update-user', onUpdateUser);
    socket.on('update-users', onUpdateUsers);
    socket.on('ap', onAP);
    socket.on('go', onGo);
    socket.on('chosung', chosungGameMan.onPacket);
    socket.on('get-timetable', onGetTimeTable);
    socket.on('reconn-server', function(data) {
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


    socket.on('search-dic', onSearchDic);
    socket.on('search-naver-main', onSearchNaverMain);
    socket.on('search-daum', onSearchDaumGoogle);
    socket.on('search-image', onSearchImage);
    socket.on('search-naver-api', onSearchNaverAPI);

    socket.on('update-notice', onUpdateNotice);
    socket.on('global-memo', onGlobalHint);
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

    if( (code >= 97 && code <= 100) ) {
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
    else if( options.isAbleArrowVote() && ( code == 37 || code == 40 || code == 39 || code == 38 ) ) {
        var idx = -1;
        if( code == 37 ) idx = 0;
        if( code == 40 ) idx = 1;
        if( code == 39 ) idx = 2;
        if( code == 38 ) idx = 3;
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
        else if( msg == "빵야") {
            mode = "emoticon";
            emoticon = "by";
        }
        else if( msg == "대박") {
            mode = "emoticon";
            emoticon = "daebak";
        }
        else if( msg == "으아") {
            mode = "emoticon";
            emoticon = "ua";
        }

        if( msg == '#cls') {
            $(this).val('');
            chatObj.clearChat();
            return;
        }

        if( msg == '#server-reload') {
            G.socket.emit('server-info-reload', {});
            $(this).val('');
            return;
        }

        if( msg == '#ban-reload') {
            G.socket.emit('ban-reload', {});
            $(this).val('');
            return;
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
        else if( msg == "4") {
            voteObj.vote({idx:3});
            isvote = 3;
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
    options.vSettings.visible = false;

    $('#btn-clear-chat').click(onClearChat);
    $('#btn-get-vote-list').click(onGetVoteList);
    $('#btn-get-search-list').click(onGetSearchList);
    $('#btn-vote-list-close').click(onBtnVoteListClose);
    $('#quiz-timetable-icon').click(onBtnTimeTable);

    $('#btn-site-menu').mouseover(function( e ) {
        e.preventDefault();
        siteMenu.vMenu.visible = true;
        options.vSettings.visible = false;
    });
    $('#btn-settings').mouseover(function(e) {
        e.preventDefault();
        options.vSettings.visible = true;
        siteMenu.vMenu.visible = false;
    })

    $('#btn-serv-1').click(onBtnGoServ1);
    $('#btn-serv-2').click(onBtnGoServ2);
    $('#btn-serv-3').click(onBtnGoServ3);
    $('#btn-serv-4').click(onBtnGoServ4);
    $('#btn-serv-5').click(onBtnGoServ5);
    $('#btn-serv-6').click(onBtnGoServ6);
    $('#btn-serv-7').click(onBtnGoServ7);
    $('#btn-serv-8').click(onBtnGoServ8);
    $('#btn-serv-9').click(onBtnGoServ9);
    $('#btn-serv-10').click(onBtnGoServ10);
    $('#btn-serv-11').click(onBtnGoServ11);
    $('#btn-serv-12').click(onBtnGoServ12);
    $('#btn-serv-13').click(onBtnGoServ13);
    $('#btn-serv-14').click(onBtnGoServ14);
    $('#btn-serv-15').click(onBtnGoServ15);
    $('#btn-serv-16').click(onBtnGoServ16);

    $(document).on('click', '.btn-ban-list-ban', onBtnBanListBtn);
    $(document).on('click', '.btn-ban-list-like', onBtnLikeListBtn);

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
function onBtnGoServ6(e) { G.socket.emit('go', {servidx: '6'}) }
function onBtnGoServ7(e) { G.socket.emit('go', {servidx: '7'}) }
function onBtnGoServ8(e) { G.socket.emit('go', {servidx: '8'}) }
function onBtnGoServ9(e) { G.socket.emit('go', {servidx: '9'}) }
function onBtnGoServ10(e) { G.socket.emit('go', {servidx: '10'}) }
function onBtnGoServ11(e) { G.socket.emit('go', {servidx: '11'}) }
function onBtnGoServ12(e) { G.socket.emit('go', {servidx: '12'}) }
function onBtnGoServ13(e) { G.socket.emit('go', {servidx: '13'}) }
function onBtnGoServ14(e) { G.socket.emit('go', {servidx: '14'}) }
function onBtnGoServ15(e) { G.socket.emit('go', {servidx: '15'}) }
function onBtnGoServ16(e) { G.socket.emit('go', {servidx: '16'}) }

function onBtnBanListBtn(e) {
    e.stopPropagation();

    var nick = $(this).attr('nick');

    if( confirm( nick + "을(를) 밴 하시겠습니까?") ) {
        G.socket.emit('ban', {sockid: '', nick: nick});
    }
}

function onBtnLikeListBtn(e) {
    e.stopPropagation();

    var nick = $(this).attr('nick');
    G.socket.emit('like', {sockid: '', nick: nick });
}

function onBtnSettings(e) {
    e.stopPropagation();
    e.preventDefault();
    options.vSettings.visible = true;
    siteMenu.vMenu.visible = false;
}

function onBtnHelp(e) {
    e.stopPropagation();
    e.preventDefault();
}

function onClearChat(e) {
    chatObj.clearChat();
}

function onGetVoteList(e) {
   G.socket.emit('get-vote-list', {});
}

function onGetSearchList(e) {
    G.socket.emit('get-search-list', {});
}

function onGetVoteListResult(packet) {

    chatObj.vSearchVoteList.sTitle = '투표자'
    chatObj.vSearchVoteList.visible = true;

    var desc = '';
    for( var i = 0 ; i < packet.length ; ++i ) {
        var d = new Date(packet[i].time);
        desc += '<tr>' +
                '<td>'+ packet[i].nick + '</td>' +
            '<td style="color:'+ color[packet[i].voteIdx] +'; font-weight: bold;">'+ (Number(packet[i].voteIdx) + 1) + '번' + '</td>' +
            '<td>'+ d.toTimeString().split(' ')[0] + '</td>' +
            '<td class="btn-ban-list-ban" nick="'+ packet[i].nick +'">밴하기</td>' +
            '<td class="btn-ban-list-like" nick="'+ packet[i].nick +'">칭찬하기</td></tr>';
    }

    var html = '<table style="width: 100%;"><tr><td>닉네임</td><td>투표번호</td><td>시간</td><td>액션</td><td>액션</td></tr>' + desc + '</table>';
    chatObj.vSearchVoteList.listHtml = html;
}

function onGetSearchListResult(packet) {

    chatObj.vSearchVoteList.sTitle = '검색리스트'
    chatObj.vSearchVoteList.visible = true;

    var desc = '';
    for( var i = 0 ; i < packet.length ; ++i ) {
        var d = new Date(packet[i].time);
        desc += '<tr>' +
            '<td>'+ packet[i].nick + '</td>' +
            '<td style="font-weight: bold;">'+ packet[i].query + '</td>' +
            '<td>'+ d.toTimeString().split(' ')[0] + '</td>' +
            '<td class="btn-ban-list-ban" nick="'+ packet[i].nick +'">밴하기</td>';
    }

    var html = '<table style="width: 100%;"><tr><td>닉네임</td><td>검색어</td><td>시간</td><td>액션</td></tr>' + desc + '</table>';
    chatObj.vSearchVoteList.listHtml = html;
}

function onBtnVoteListClose(e) {
    e.stopPropagation();

    chatObj.vSearchVoteList.visible = false;
}

function onBtnTimeTable(e) {
    e.stopPropagation();

    var winHeight = document.body.clientHeight;	// 현재창의 높이
    var winWidth = document.body.clientWidth;	// 현재창의 너비
    var winX = window.screenLeft;	// 현재창의 x좌표
    var winY = window.screenTop;	// 현재창의 y좌표
    var popWidth = 400;
    var popHeight = 300;
    var popX = winX + (winWidth - popWidth)/2;
    var popY = winY + (winHeight - popHeight)/2;
    window.open('/timetable','popup','width='+popWidth+',height='+popHeight+',top=' + popY + ',left=' + popX);
}

function onChat( data ) {

    var d =  '<span class="chat-time"> (' + data.time + ')</span>';

    var item = {
        mode: data.mode,
        auth: data.auth,
        isBaned: data.isBaned,
        sockid: data.sockid,
        ip: data.ip,
        nick: data.nickname,
        msg: ( data.admin ? data.msg : strip(data.msg) ) + d,
        isAdmin: data.admin,
        vote: data.vote
    }

    if( data.mode == "vote" ) {
        if( options.isShowMemberVoteOnly() &&
            ( (typeof data.auth == 'undefined') || (data.auth < 0 ) )
        ) {
        }
        else if( options.isShowSearchUserVoteOnly() && data.auth < 4 ) {
            //
        }
        else {
            chatObj.addChat( item );
        }
    }
    else if( data.mode == "search") {
        if( !isShowSearchChat() ) return;
        chatObj.addChat( item );
    }
    else if ( data.mode == "notice") {
        chatObj.addChat( item );
    }
    else if ( data.mode == "ban") {
        chatObj.addChat( item );
    }
    else {
        if( options.isNotShowChat() ) return;
        chatObj.addChat( item );
    }
}

function onAdminMsg(data) {
    var item = {
        mode: 'admin',
        auth: 50,
        isBaned: false,
        sockid: '',
        ip: data.ip,
        nick: '[서버]',
        msg: data.msg,
        isAdmin: true
    }

    chatObj.addChat( item );
}

function onServMsg(data) {
    showAdminMsg(data.msg);
}

function onLoginInfo(data) {
    G.sockid = data.socket;
    G.isLogin = data.isLogined;
    G.auth = data.auth;
    G.isAdminMembers = data.isAdminMembers;
    siteMenu.vMenu.isAdminMembers = data.isAdminMembers;
    setVisible($('.admin-component'), data.auth >= 50);
    setNickName(data.nick);
    options.setShowMemberVoteOnly();
    options.setShowHighLevelVoteOnly();
    options.setSearchOptions();

    showNextQuizTimeLeft(data.quizTable);
}

function showNextQuizTimeLeft(table) {
    var tCur = new Date();
    var bFind = false;
    var findDate = '';
    var findName = '';
    for( var i = 0 ; i < table.length ; ++i ) {
        var item = table[i];
        var date = tCur.getFullYear() + '-' + (tCur.getMonth()+1) + '-' + tCur.getDate() + ' ' + item.starttime;
        var tDateObj = new Date(date);

        if( tDateObj - tCur >= 0 ) {
            bFind = true;
            findName = item.name;
            findDate = date;
            break;
        }
    }

    if( table.length ) {
        if( bFind ) {
            $('#clock').countdown(findDate, {elapse: true })
                .on('update.countdown', function(event) {
                    if( event.elapsed ) {
                        showNextQuizTimeLeft(table);
                    }
                    else {
                        $(this).html('<span class="name">' + findName + '</span> ' + event.strftime('%H시간%M분%S초') + ' 남음');
                    }
                })
        }
        else {
            $('#clock').html('오늘 퀴즈쇼 끝!');
            /*
            var item = table[table.length - 1];
            console.log(item);
            var date = tCur.getFullYear() + '-' + (tCur.getMonth()+1) + '-' + tCur.getDate() + ' ' + item.starttime;
            console.log(date);
            $('#clock').countdown(date, {elapse: true })
                .on('update.countdown', function(event) {
                    $(this).html('마지막 퀴즈로부터 ' + event.strftime('%H:%M:%S') + ' 지남');
                })
                */
        }
    }
}

function onUpdateInfo(data) {
    G.vUserInfo.ap = data.ap;
}

function onGetTimeTable(packet) {
    window.open('/timetable','popup','width='+200+',height='+400+'');
}

function onSearchDic(data) {
    var ret_cnt_val = localStorage.getItem('ret_cnt') || 3;
    if( ret_cnt_val >= 2 ) {
        ret_cnt_val = 2;
    }

    try {
        if( data.data ) {
            data.data = data.data.slice(0,ret_cnt_val);
        }

        if( data.hdata ) {
            data.hdata = data.hdata.slice(0,ret_cnt_val);
        }

        if( data.edata ) {
            data.edata = data.edata.slice(0,ret_cnt_val);
        }

        if( options.vSettings.search.dicKor.checked )
            setSearchRet(data.data, true, searchObj.whereSearchDicKor, '[국어사전]', 'krdic');
        if( options.vSettings.search.dicHan.checked )
            setSearchRet(data.hdata, true, searchObj.whereSearchDicHan, '[한자사전]', 'hdic');
        if( options.vSettings.search.dicEng.checked )
            setSearchRet(data.edata, true, searchObj.whereSearchDicEng, '[영어사전]', 'edic');
    }catch( e ) {
        console.log(e);
        clearTimeout(searchObj.timerID);
        searchObj.timerID = setTimeout(function() {
            searchObj.restoreSearch();
        }, 13000);
    }
}

function onSearchNaverMain(data) {
    var itemMap = procSearchRet(data);
    var keys = itemMap.keys();
    for( var i = 0 ; i < keys.length ; ++i ) {
        var key = keys[i];
        var items = itemMap.get(key);
        var isShow = getShow(key);
        if( !isShow ) return;
        var where = getWhere(key);
        setSearchRet(items, false, where, search_title_prefix[0], search_title_prefix_style_name[0]);
    }
}

function onSearchNaverAPI(packet) {
    var data = packet.data;
    var type = packet.type;
    var sPrefix = packet.prefix;

    //  type : 백과사전 , 웹, 뉴스, 지식인
    var typeEnableList = [
        {enabled: options.vSettings.search.naverEncyc.checked, where: options.vSettings.search.naverEncyc.where, first: true },
        {enabled: options.vSettings.search.naverWeb.checked, where: options.vSettings.search.naverWeb.where, first: false },
        {enabled: options.vSettings.search.naverNews.checked, where: options.vSettings.search.naverNews.where, first: false },
        {enabled: options.vSettings.search.naverKin.checked, where: options.vSettings.search.naverKin.where, first: false },
        {enabled: options.vSettings.search.naverBlog.checked, where: options.vSettings.search.naverBlog.where, first: false }
    ];

    if( !typeEnableList[type].enabled ) return;

    if( data && data.length > 0 ) {
        var where = typeEnableList[type].where;
        var ret_cnt_val = localStorage.getItem('ret_cnt') || 3;
        data = data.slice(0, ret_cnt_val);
        setSearchRet(data, typeEnableList[type].first, where, '[' + sPrefix + ']', search_title_prefix_style_name[type]);
    }
}

function onSearchDaumGoogle(data) {
    var ret_cnt_val = localStorage.getItem('ret_cnt') || 3;
    data = data.slice(0, ret_cnt_val);
    setSearchRet(data, true, searchObj.whereSearchDaum, '[다음(구글)]', "cb6");
}

function onSearchImage(data) {
    setSearchRetImage(data, true, searchObj.whereSearchImage);
}

function onUpdateNotice(data) {
    $('#notice').html(data.noticeData);
}

function onGlobalHint(packet) {
    hintObj.onGlobalHint(packet);
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

function stopVideo() {
    //$('#video-player')[0].contentWindow.postMessage('{"event":"command","func":"stopVideo","args":""}', '*');
}

function searchWebRoot( socket, query, isBroadcast ) {
    stopVideo();
    searchObj.vSearchAreaCenter.kinHtml = '';

    if( !G.isLogin ) {
        showAdminMsg('검색은 로그인 후에 가능합니다');
        return;
    }

    var tCur = new Date();
    if( tCur - searchObj.tLastSearch <= 500 ) {
        showAdminMsg('검색은 여유를 두고!');
        return;
    }

    if( query.length <= 1 ) {
        showAdminMsg('검색어는 2자 이상');
        return;
    }

    searchObj.duplicateMap = new Map();
    searchObj.tLastSearch = tCur;

    searchObj.initSearch();
    var nick = getNickName();

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

    var json = {
        nickname: nick,
        msg: query,
        isBroadcast : isBroadcast,
        searchDic: options.vSettings.search.dicEng.checked || options.vSettings.search.dicHan.checked || options.vSettings.search.dicKor.checked || chinese,
        searchNaverMain: true,
        searchNaverMainAPI: [
            options.vSettings.search.naverEncyc.checked,
            options.vSettings.search.naverWeb.checked,
            options.vSettings.search.naverNews.checked,
            options.vSettings.search.naverKin.checked,
            options.vSettings.search.naverBlog.checked
        ],
        searchImage: options.vSettings.search.naverImage.checked,
        searchDaum: options.vSettings.search.daum.checked
    }



    var searched = false;
    if( G.auth >= 4 ) {
        for( var i = 0 ; i < json.searchNaverMainAPI.length ; ++i ) {
            if( json.searchNaverMainAPI[i] ) {
                searched = true;
                break;
            }
        }
    }

    if( json.searchImage ) {
        searchObj.whereSearchImage = options.vSettings.search.naverImage.where;
        searched = true;
    }
    if( json.searchDaum ) {
        searchObj.whereSearchDaum = options.vSettings.search.daum.where;
        searched = true;
    }
    if( json.searchDic ) {
        searchObj.whereSearchDicEng = options.vSettings.search.dicEng.where;
        searchObj.whereSearchDicKor = options.vSettings.search.dicKor.where;
        searchObj.whereSearchDicHan = options.vSettings.search.dicHan.where;
        searched = true;
    }

    if( dongyo ) {
        searchWebDongyo(dongyoQuery, 2);
        searched = true;
    }

    if( options.vSettings.search.localDB.checked ) {
        console.log('db');
        var where = options.vSettings.search.localDB.where;
        searchFromDB(query, where);
        searched = true;
    }
    if( !searched ) {
        //$('.search_article').html(htmlBackup);
        $('#sd_ret').css('display','none');
        $('#sd_ads').css('display','inline-block');
    }
    else {
        socket.emit('search', json);
    }
}

function showKin(datalist) {
    if( !searchObj.isRunning ) return;
    if( searchObj.isKinModifying ) return;
    searchObj.isKinModifying = true;
    var desc_total = '';
    var kinlist = voteObj.kinlist;

    if( kinlist.length > 0 ) {
        /*
        kinlist.sort(function(item1, item2) {
            var item1s = item1.desc.replace(/[^0-9]/g,'');
            var item2s = item2.desc.replace(/[^0-9]/g,'');
            return item1s.localeCompare(item2s);
        });
        */

        for( var i = 0 ; i < kinlist.length ; ++i ) {
            var item = kinlist[i];
            var div = ' <div class="search_ret_desc"> ' +
                strip(item.word) + ' : ' + strip(item.desc) +
                ' </div> ';
            desc_total += div;
        }

        var kin_total_desc = ' <div class="search_ret_title kin_style">[지식의 바다] 의 결과 입니다</div> ' +
                            desc_total + ' <div class="separator"></div> ';

        searchObj.duplicateMap.clear();
        for( var i = 0 ; i < datalist.length ; ++i ) {
            var words = datalist[i].query.split(' ');
            for( var w = 0 ; w < words.length ; ++w ) {
                //if( searchObj.lastSearchQuery.indexOf(words[w]) != -1) continue;
                if( searchObj.duplicateMap.containsKey( words[w]) ) continue;
                if( '<search-top-ret>'.indexOf(words[w]) != -1) continue;

                var exp = new RegExp(words[w], "gi");
                kin_total_desc = kin_total_desc.replace(exp, '<search-top-ret>' + words[w] + '</search-top-ret>');

                searchObj.duplicateMap.put(words[w], 1);
            }
        }

        var kin_total_html = ' <div id="kindata" class="search_ret_root"> ' +
            kin_total_desc +
            ' </div> ';

        searchObj.vSearchAreaCenter.kinHtml = kin_total_html;
    }

    searchObj.isKinModifying = false;
}

var search_title_prefix = ['[백과사전]', '[지식인]', '[블로그]', '[뉴스]', '[이미지]','[다음(구글)]', '[백과사전]', '[백과사전]'];
var search_title_prefix_style_name = ['cb1', 'cb2', 'cb3', 'cb4', 'cb5', 'cb6', 'cb7', 'cb8'];

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
    var keys = map.keys();
    for( var i = 0 ; i < keys.length ; ++i ) {
        var key = keys[i];
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

        var title = '[기출문제] ' + item.question;

        getSearchArea(where).articles.push({title: title, desc: sub, except: true })
    }

    clearTimeout(searchObj.timerIDForDB);
    searchObj.timerIDForDB = setTimeout(function() {
        //$('.search_article').html(htmlBackup);
        searchObj.restoreSearch();
    }, 13000);
}


function setSearchRetImage(items, first, where) {
    var div = '';
    for( var i = 0 ; i < items.length ; ++i) {
        var item = items[i];
        var image = '<img class="img_search" src="'+ item.thumbnail + '"/>';
        div += image;
    }

    getSearchArea(where).articles.push({title:'', desc: div, except: true});

    clearTimeout(searchObj.timerID);
    searchObj.timerID = setTimeout(function() {
        //$('.search_article').html(htmlBackup);
        searchObj.restoreSearch();
    }, 15000);
}

function setSearchRet(items, first, where, title_prefix, title_prefix_style) {
    try {
        title_prefix = '<title-prefix class="'+ title_prefix_style + '">' + title_prefix + '</title-prefix>';

        for( var i = 0 ; i < items.length ; ++i) {
            var item = items[i];
            if( item.category && item.category != '') {
                title_prefix = '<title-prefix class="title-prefix-ex">[' + item.category + ']</title-prefix>';
            }
            var hidx = item.description.indexOf('[총획]');
            var hidxend = item.description.indexOf('[난이도]');
            if( hidxend == -1 ) hidxend = hidx + 20;
            var hinfo = '<b>' + item.description.slice(hidx, hidxend).trim() + '</b>';

            var title = title_prefix + ' ' + item.title + ' ' + hinfo;
            var desc = item.description;

            var k = { title : title, desc: desc, except: false };
            if( first ) {
                getSearchArea(where).articles.unshift( k );
            }
            else {
                getSearchArea(where).articles.push( k );
            }
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
        return searchObj.vSearchAreaLeft;
    }
    else {
        return searchObj.vSearchAreaCenter;
    }
}

function onEmoticon(_data) {

    var item = {
        mode: 'emoticon',
        auth: _data.auth,
        isBaned: _data.isBaned,
        sockid: _data.sockid,
        ip: _data.ip,
        nick: _data.nick,
        msg: '',
        isAdmin: _data.admin,
        vote: _data.vote
    }

    var emoticonName = 'hong_shock';

    switch( _data.name ) {
        case "bbam":
            emoticonName = 'hong_shock';
            break;
        case "ddk":
            emoticonName = 'ddoddoke';
            break;

        case "yeee":
            emoticonName = 'yeee';
            break;

        case "hi":
            emoticonName = 'hi';
            break;

        case "by":
            emoticonName = 'by';
            break;

        case "daebak":
            emoticonName = 'emo_daebak';
            break;

        case "ua":
            emoticonName = 'ua';
            break;
    }

    item.msg = '<img style="width:80px; height:80px;" src="/images/' + emoticonName + '.png"/>';
    chatObj.addChat( item );
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
    G.vUserInfo.ap = data.ap;
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