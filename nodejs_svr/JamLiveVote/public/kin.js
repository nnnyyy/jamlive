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
        success: function(data) {
            console.log(data);
        }
    });
}