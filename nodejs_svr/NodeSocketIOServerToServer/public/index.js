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
        el:'#app',
        data: {
            logined: false,
            isAccessable: false,
            rsrMsg: '',
            rsrBtnMsg: '',
            rsrWord: '',
            servers: [
            ],
            ip_id: '',
            ip_pw:'',
            adminlogs: [
                { regdate: '2018-01-20', act: '밴', contents: '누가 누구를 어쩌구 저쩌구', nick: '냥냥이' }
            ]
        },
        methods: {
            onBtnMenu: function(idx) {
                switch(idx) {
                    case -1: window.location.href = '/'; break;
                    case 0: window.location.href = '/status'; break;
                    case 1: window.location.href = '/msg'; break;
                    case 2: window.location.href = '/ban'; break;
                    case 3: window.location.href = '/adminlog'; break;
                    case 4: window.location.href = '/'; break;
                }
            },
            onBtnSendRSR: function(e) {
                e.preventDefault();
                e.stopPropagation();
                var packet = {
                    msg: this.rsrMsg,
                    btnMsg: this.rsrBtnMsg,
                    word: this.rsrWord
                };
                ajaxHelper.postJson('/rsr', packet, null);
            },
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
                var v = this;
                e.preventDefault();
                e.stopPropagation();
                var packet = { name: server.name, limit: server.limit };
                ajaxHelper.postJson('/setServerLimit', packet , function(result) {
                    v.showSetServerLimitMsg(result.ret);
                });
            },
            onBtnFreezeChat: function(e) {
                var packet = {};
                ajaxHelper.postJson('/freezechat', packet , function(result) {
                    alert('채팅창을 얼렸습니다.');
                });
            },
            onBtnLogin: function(e) {
                $.ajax({
                    type: 'POST',
                    dataType: 'json',
                    data: JSON.stringify({
                        id: this.ip_id,
                        pw: this.ip_pw
                    }),
                    contentType: 'application/json',
                    url: '/login',
                    success: function(ret) {
                        if( ret != 0 ) {
                            alert('!');
                        }
                        else {
                            window.location.href = '/';
                        }
                    }
                });
            },
            showPermanentMsg(ret) {
                var msg = '';
                switch(ret) {
                    case 0: msg = '정상적으로 밴 처리 되었습니다.'; break;
                    case -1: msg = '유저가 존재하지 않습니다.'; break;
                }

                alert(msg);
            },
            showSetServerLimitMsg(ret) {
                var msg = '';
                switch(ret) {
                    case 0: msg = '정상적으로 설정되었습니다.'; break;
                    case -1: msg = '반영되지 않았습니다!'; break;
                }

                alert(msg);
            }
        }
    });
}

var GlobalValue = function() {

}

var G = new GlobalValue();