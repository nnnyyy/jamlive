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
            isAccessable: false
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
                e.preventDefault();
                e.stopPropagation();
                var msg = $('#ip-ban-nick').val();
                if( msg.trim() == '' ) return;
                ajaxHelper.postJson('/banbynick', { nick: msg.trim() }, function(result) {
                    alert(result.ret);
                });
            }
        }
    });
}

var GlobalValue = function() {

}

var G = new GlobalValue();