/**
 * Created by nnnyyy on 10/27/2018.
 */
var G;

function init(logined, totalUserCnt) {
    console.log('pc init', logined);
    G = new Global(logined);
    console.log(totalUserCnt);
    G.vApp.totalUserCnt = totalUserCnt;
}


var Global = function(logined) {
    this.vApp = new Vue({
        el: '#app',
        data: {
            logined: logined,
            adminShow: false,
            adminMsg: '',
            totalUserCnt: 0,
            servers: [
                {name: '서버1', idx: '1'},
                {name: '서버2', idx: '2'},
                {name: '서버3', idx: '3'},
                {name: '서버4', idx: '4'},
                {name: '서버5', idx: '5'},
                {name: '서버6', idx: '6'},
                {name: '서버7', idx: '7'},
                {name: '서버8', idx: '8'},
                {name: '서버9', idx: '9'},
                {name: '서버10', idx: '10'},
                {name: '서버11', idx: '11'},
                {name: '서버12', idx: '12'},
                {name: '서버13', idx: '13'},
                {name: '서버14', idx: '14'},
                {name: '서버15', idx: '15'},
                {name: '서버16', idx: '16'}
            ]
        },
        methods: {
            onBtnSignUp: function() {
                window.location.href = '/signup/';
            },
            onBtnChangePw: function() {
                window.location.href = '/changepw/';
            },
            onBtnLogin: function() {
                window.location.href = '/login/';
            },
            onBtnAbout: function() {
                window.location.href = '/about/';
            },
            onBtnQuizShow: function() {
                window.location.href = '/quizshow/';
            },
            onBtnSignOut: function() {
                $.ajax({
                    type: 'POST',
                    dataType: 'json',
                    data: JSON.stringify({
                    }),
                    contentType: 'application/json',
                    url: '/logout',
                    success: function(data) {
                        window.location.href = unescape(window.location.pathname);
                    }
                });
            },
            onBtnGo: function(idx, e) {
                e.stopPropagation();
                $.ajax({
                    type: 'POST',
                    dataType: 'json',
                    data: JSON.stringify({
                        servidx: idx
                    }),
                    contentType: 'application/json',
                    url: '/go',
                    success: function(data) {
                        if( data.ret == 0 ) {
                            window.location.href = data.url;
                        }
                        else {
                            showAdminMsg(data.msg);
                        }
                    }
                });
            }
        }
    });
};

function showAdminMsg(msg) {
    G.vApp.adminMsg = msg;
    G.vApp.adminShow = true;

    setTimeout(function() {
        G.vApp.adminShow = false;
    }, 2500);
}