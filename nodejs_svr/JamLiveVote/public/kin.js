/**
 * Created by nnnyy on 2018-08-28.
 */
'use strict'


function init() {
    G.init();
    initKeyEvent();
}

function Global() {
}

var G = new Global();

Global.prototype.init = function() {
    console.log('Global init start');
    this.eSearchWord = $('#ip-search-word');
    this.eNoData = $('#no-data');
    this.eModifyData = $('#modify-data');

    setVisible(this.eNoData, true);
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

function SearchWordListener(e) {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            word: G.eSearchWord.val().trim()
        }),
        contentType: 'application/json',
        url: '/search-word',
        success: function(packet) {
            if( packet.ret != 0 || packet.data.length <= 0 ) {
                G.setModifyMode(false);
            }
            else {
                G.setModifyMode(true);
            }
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