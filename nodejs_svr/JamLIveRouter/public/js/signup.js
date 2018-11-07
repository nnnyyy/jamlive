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
            onBtnSignUp: function() {
                var ret = 0;
                if( (ret = validation(this.id, this.pw, this.pwre, this.nick)) < 0) {
                    //  실패
                    showErrorMsg(ret);
                    this.inputDisabled = false;
                    return;
                }

                sendPostSignup({id: this.id, pw: this.pw, nick: this.nick});
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

function validation(id, pw, pwre, nick ) {
    var id_pattern = new RegExp(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,10}$/);
    var ret = id_pattern.test(id);
    if( ret == false ) {
        return -1;
    }

    var pw_pattern = new RegExp(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,12}$/);
    ret = pw_pattern.test(pw);
    if( ret == false ) {
        return -2;
    }

    if( pw != pwre ) {
        return -3;
    }

    if( getTextLength(nick) < 4 || getTextLength(nick) > 8) {
        return -4;
    }

    var nick_pattern =  new RegExp(/[\{\}\[\]\/?.,;:|\)*~`!^\-_+<>@\#$%&\\\=\(\'\"]/gi);
    ret = nick_pattern.test(nick);
    if( ret == true ) {
        //  특문 포함
        return -5;
    }

    console.log('success');

    return 0;
}

function getTextLength(str) {
    var len = 0;
    for (var i = 0; i < str.length; i++) {
        if (escape(str.charAt(i)).length == 6) {
            len++;
        }
        len++;
    }
    return len;
}

function showErrorMsg(ret) {
    var msg = '';
    switch(ret) {
        case -1:
            msg = '아이디 조건이 맞지 않습니다.';
            break;

        case -2:
            msg = '비밀번호 조건이 맞지 않습니다.';
            break;

        case -3:
            msg = '비밀번호가 서로 다름';
            break;

        case -4:
            msg = '닉네임 조건 X';
            break;

        case -5:
            msg = '닉네임에 특수문자 있음';
            break;

        case -99:
            break;

        case -101:
            msg = '아이디나 닉네임이 이미 존재합니다';
            break;
    }

    showAdminMsg(msg);
}

function sendPostSignup(data) {
    $.ajax({
        type: 'POST',
        dataType: 'json',
        data: JSON.stringify({
            id: data.id,
            pw: data.pw,
            nick: data.nick
        }),
        contentType: 'application/json',
        url: '/signup_req',
        success: function(ret) {
            if( ret.ret != 0 ) {
                showErrorMsg(ret.ret);

                var inputs = [$('#ip_id'), $('#ip_pw'), $('#ip_pwre'), $('#ip_nick')];
                for( var i = 0 ; i < inputs.length ; ++i) {
                    inputs[i].prop('disabled', false);
                }
            }
            else {
                alert('가입 완료!');
                window.location.href = document.referrer;
            }
        }
    });
}