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

function init( socket ) {
    G.socket = socket;
    initChart();
    setSocketEvent();
}

function setSocketEvent() {
    G.socket.on('votedata', onVoteData );
}

var GlobalValue = function() {
    this.socket = null;
}

var G = new GlobalValue();


function initChart() {
    for( var i = 0 ; i < 12 ; ++i ) {
        showBarChart('.ct-chart' + i,['1번','2번','3번'],[[1,1,1]], {
            seriesBarDistance: 10,
            height: 120,
            axisX: {
                offset: 30
            },
            axisY: {
                offset: 30,
                onlyInteger: true
            }
        });
    }
}

function onVoteData( packet ) {
    var datalist = packet.data;
    datalist.sort(function(item1, item2) {
        return item1.idx - item2.idx;
    });

    for( var i = 0 ; i < 12 ; ++i ) {
        var data = [0,0,0];
        var cnt = 0;
        var name = '----';
        if( datalist.length > i ) {
            var item = datalist[i];
            data = item.votedata;
            cnt = item.cnt;
            name = item.name;
        }

        $('.user-cnt' + i).text(cnt);
        $('.serv-name' + i).text(name);
        showBarChart('.ct-chart' + i,['1번','2번','3번'],[data], {
            seriesBarDistance: 10,
            height: 120,
            high: 10,
            axisX: {
                offset: 30
            },
            axisY: {
                offset: 30,
                onlyInteger: true
            }
        });
    }
}