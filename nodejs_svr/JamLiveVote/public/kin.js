/**
 * Created by nnnyy on 2018-08-28.
 */
'use strict'


function init() {
    G.init();
    initKeyEvent();
    initBtnEvent();
}

function TopMenuObject() {
    this.btnLogin = $('#btn-login');
    this.btnLogin.click( onBtnLogin );
    this.btnLogout = $('#btn-logout');
    this.btnLogout.click( onBtnLogout );
    this.btnSignup = $('#btn-signup');
    this.btnSignup.click( onBtnSignup );
}

var topMenuObj = new TopMenuObject();

function onBtnLogin(e) {
    window.location.href = '/signin';
}

function onBtnSignup(e) {
    window.location.href = '/signup';
}

function onBtnLogout(e) {
    logout();
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

var ajaxHelper = new AjaxHelper();

function Global() {
}

var G = new Global();

Global.prototype.init = function() {
    console.log('Global init start');
    this.eSearchWord = $('#ip-search-word');
    this.eNewWord = $('#ip-new-word');
    this.eNewDesc = $('#ip-new-desc');
    this.eNoData = $('#no-data');
    this.eModifyData = $('#modify-data');
    this.eDesc = $('#ip-desc');
    this.btnRegister = $('#btn-register');
    this.btnModify = $('#btn-modify');
    this.btnDelete = $('#btn-delete');

    setVisible(this.eNoData, false);
    setVisible(this.eModifyData, false);
}

Global.prototype.setModifyMode = function( bModify ) {
    setVisible(this.eNoData, !bModify);
    setVisible(this.eModifyData, bModify);
}

function initKeyEvent() {
    console.log('initKeyEvent Start');
    G.eSearchWord.keyup(SearchWordListener);
}

function initBtnEvent() {
    G.btnRegister.click(onBtnRegister);
    G.btnModify.click(onBtnModify);
    G.btnDelete.click(onBtnDelete);
}

function onBtnRegister(e) {
    e.preventDefault();

    var newWord = G.eNewWord.val().trim();
    var desc = G.eNewDesc.val().trim();
    if( newWord.length < 1 || desc.length < 1 ) {
        alert('단어나 설명 정보가 너무 짧습니다');
        return;
    }
    G.btnRegister.prop('disabled', true);
    ajaxHelper.postJson('/search-word-register', { word: newWord, desc: desc }, function(data) {
        var ret = data.ret;
        G.btnRegister.prop('disabled', false);
        if( ret == 0 ) {
            G.eNewDesc.val('');
            SearchWord(newWord);
        }
        else {
            switch( ret ) {
                    case -1:
                    {
                        alert('로그인이 필요합니다');
                        break;
                    }
                    case -2:
                    {
                        alert('레벨 4 이상만 가능합니다');
                        break;
                    }
                    default:
                    break;
            }
        }
    });
}

function onBtnModify(e) {
    e.preventDefault();

    var desc = G.eDesc.val().trim();
    if( desc.length < 1 ) {
        alert('단어나 설명 정보가 너무 짧습니다');
        return;
    }

    var sn = Number(G.eDesc.attr('sn'));
    console.log(sn);
    G.btnModify.prop('disabled', true);
    ajaxHelper.postJson('/search-word-modify', { sn: sn, desc: desc }, function(data) {
        var ret = data.ret;
        G.btnModify.prop('disabled', false);
        if( ret == 0 ) {
            G.eNewDesc.val('');
            alert('수정 완료');
        }
        else {
            switch( ret ) {
                case -1:
                {
                    alert('로그인이 필요합니다');
                    break;
                }
                case -2:
                {
                    alert('레벨 4 이상만 가능합니다');
                    break;
                }
                default:
                    break;
            }
        }
    });
}

function onBtnDelete(e) {
    e.preventDefault();

    var sn = Number(G.eDesc.attr('sn'));
    console.log(sn);
    G.btnModify.prop('disabled', true);
    ajaxHelper.postJson('/search-word-delete', { sn: sn, desc: desc }, function(data) {
        var ret = data.ret;
        if( ret == 0 ) {
            G.btnModify.prop('disabled', false);
            G.eNewDesc.val('');
            var query = $('current-word').text().trim();
            SearchWord(query);
        }
        else {
        }
    });
}

function SearchWordListener(e) {
    var query = G.eSearchWord.val().trim();
    SearchWord(query);
}

function SearchWord(query) {
    if( query == '' ) {
        setVisible(G.eNoData, false);
        return;
    }

    ajaxHelper.postJson('/search-word', { word: query }, function( packet ) {
        if( packet.ret != 0 || packet.data.length <= 0 ) {
            G.eNewWord.val(query);
            G.setModifyMode(false);
        }
        else {
            var d = new Date(packet.data[0].date);
            $('current-word').text( packet.data[0].word );
            $('current-nick').text( packet.data[0].nick );
            $('current-date').text( d.toISOString().substring(0, 10) + ' ' + d.toISOString().substring(11, 19 ) );
            G.eDesc.val(packet.data[0].desc);
            G.eDesc.attr('sn', packet.data[0].sn);
            G.setModifyMode(true);
        }
    });
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