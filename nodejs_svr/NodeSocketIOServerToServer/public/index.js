/**
 * Created by nnnyyy on 2018-09-11.
 */
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

function init() {
    initVueObject();
}

function initVueObject() {
    G.app = new Vue({
        el:'#root',
        data: {
            logined: false,
            isAccessable: false,
            servers: [
            ]
        },
        methods: {
            onBtnSendAdminMsg: function(e) {
                e.preventDefault();
                e.stopPropagation();
                var msg = $('#ip-msg').val();
                if( msg.trim() == '' ) return;
                ajaxHelper.postJson('/msg', { msg: msg }, null);
                $('#ip-msg').val('');
            },
            onBtnPermanentBanBynick: function(e) {
                var v = this;
                e.preventDefault();
                e.stopPropagation();
                var msg = $('#ip-ban-nick').val();
                if( msg.trim() == '' ) return;
                ajaxHelper.postJson('/banbynick', { nick: msg.trim() }, function(result) {
                    v.showPermanentMsg(result.ret);
                });
            },
            onBtnSetServerLimit: function(server, e) {
                e.preventDefault();
                e.stopPropagation();
                alert('기능 제작 중');
            },
            showPermanentMsg(ret) {
                var msg = '';
                switch(ret) {
                    case 0: msg = '정상적으로 밴 처리 되었습니다.'; break;
                    case -1: msg = '유저가 존재하지 않습니다.'; break;
                }

                alert(msg);
            }
        }
    });
}

var GlobalValue = function() {

}

var G = new GlobalValue();