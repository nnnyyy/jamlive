/**
 * Created by nnnyy on 2018-11-08.
 */
function init(logined) {
    G = new Global(logined);
}

var Global = function(logined) {

    this.vApp = new Vue({
        el: '#app',
        data: {
            inputDisabled: false,
            beforepw: '',
            pw:'',
            pwre:'',
            adminMsg: '',
            adminShow: false
        },
        methods: {
            onBtnChangePw: function() {
                var ret = validation( this.beforepw, this.pw, this.pwre );
                if( ret != 0 ) {
                    showErrorMsg(ret);
                    return;
                }

                this.sendChangePw({bpw: this.beforepw, pw: this.pw });
            },
            sendChangePw: function(packet) {
                G.vApp.inputDisabled = true;
                $.ajax({
                    type: 'POST',
                    dataType: 'json',
                    data: JSON.stringify(packet),
                    contentType: 'application/json',
                    url: '/changepw',
                    success: function(ret) {
                        if( ret.ret != 0 ) {
                            showErrorMsg(ret.ret);
                            G.vApp.inputDisabled = false;
                        }
                        else {
                            alert('비밀번호가 변경되었습니다');
                            window.location.href = document.referrer;
                        }
                    }
                });
            }
        }
    });

    if( !logined ) {
        window.location.href = '/login';
        return;
    }
};

function showAdminMsg(msg) {
    G.vApp.adminMsg = msg;
    G.vApp.adminShow = true;

    setTimeout(function() {
        G.vApp.adminShow = false;
    }, 1000);
}

function showErrorMsg(ret) {
    var msg = '';
    switch(ret) {
        case -2:
            msg = '비밀번호 조건이 맞지 않습니다.';
            break;

        case -3:
            msg = '비밀번호가 서로 다름';
            break;

        case -99:
            msg = '알 수 없는 오류';
            break;

        case -101:
            msg = '기존 비밀번호가 틀렸거나 알 수 없는 오류입니다.';
            break;
    }

    showAdminMsg(msg);
}



function validation( beforepw, pw, pwre ) {

    var pw_pattern = new RegExp(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,12}$/);

    ret = pw_pattern.test(beforepw);
    if( ret == false ) {
        return -2;
    }

    ret = pw_pattern.test(pw);
    if( ret == false ) {
        return -2;
    }

    if( pw != pwre ) {
        return -3;
    }

    return 0;
}