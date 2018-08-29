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
    this.eDesc = $('#ip-desc');

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
                var d = new Date(packet.data[0].date);
                $('current-word').text( packet.data[0].word );
                $('current-nick').text( packet.data[0].nick );
                $('current-date').text( d.toISOString().substring(0, 10) + ' ' + d.toISOString().substring(11, 19 ) );
                G.eDesc.val(packet.data[0].desc);
                G.eDesc.attr('sn', packet.data[0].sn);
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