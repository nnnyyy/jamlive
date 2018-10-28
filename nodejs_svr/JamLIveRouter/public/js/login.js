/**
 * Created by nnnyyy on 10/28/2018.
 */
var G;

function init(logined) {
    console.log('mobile init');
    G = new Global(logined);
}

var Global = function(logined) {
    this.vApp = new Vue({
        el: '#app',
        data: {
            logined: logined,
            adminShow: false,
            adminMsg: '',
            id: '',
            nick: '',
            pw: '',
            pwre: '',
            inputDisabled: false
        },
        methods: {
            onBtnLogin: function() {
                var ret = 0;
                if( (ret = validation(this.id, this.pw)) < 0 ) {
                    showErrorMsg(ret);
                    for( var i = 0 ; i < inputs.length ; ++i) {
                        inputs[i].prop('disabled', false);
                    }
                    return;
                }

                sendPostSignin({id: this.id, pw: this.pw});
            },
            onBtnBack: function() {
                window.location.href = 'http://databucket.duckdns.org:4700/m/';
            }
        }
    });
};

function showAdminMsg(msg) {
    G.vApp.adminMsg = msg;
    G.vApp.adminShow = true;

    setTimeout(function() {
        G.vApp.adminShow = false;
    }, 1000);
}

function validation(id, pw) {
    if( id.length <= 0 || pw.length <= 0 ) {
        return -1;
    }
}

function showErrorMsg(ret) {
    var msg = '';
    switch(ret) {
        case -1:
            msg = '아이디 또는 패스워드를 입력해 주세요';
            break;

        case -101:
            msg = '아이디 또는 패스워드가 틀렸습니다';
            break;
    }

    showAdminMsg(msg);
}

function sendPostSignin(data) {
    G.vApp.inputDisabled = true;
    $.ajax({
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            id: data.id,
            pw: data.pw
        }),
        contentType: 'application/json',
        url: '/login',
        success: function(ret) {
            if( ret != 0 ) {
                showErrorMsg(ret);
                G.vApp.inputDisabled = false;
            }
            else {
                window.location.href = 'http://databucket.duckdns.org:4700/m/';
            }
        }
    });
}