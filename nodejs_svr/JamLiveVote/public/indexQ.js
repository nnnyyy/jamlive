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

var GlobalValue = function() {

};

GlobalValue.prototype.init = function() {
    this.vApp = new Vue({
        el:'#app',
        data: {
            isPermitted: false,
            searchKeyword: '',
            searchItems:[],
            rmode: 'modify',
            visibleSearch: true,
            visibleAdd: false,
            insertQuestion: '',
            insAnswer1: '',
            insAnswer2: '',
            insAnswer3: '',
            insCollectIdx: 0
        },
        methods: {
            onChangeSearchKeyword: function() {
                var v = this;
                ajaxHelper.postJson('/quizSearch', {keyword: this.searchKeyword}, function(result) {
                    if( result.ret == 0 ) {
                        result.list.forEach(function(item) {
                            item.isModifying = false;
                            item.questionM = item.question;
                            item.answer1M = item.answer1;
                            item.answer2M = item.answer2;
                            item.answer3M = item.answer3;
                            item.collect_idxM = item.collect_idx;
                        });

                        v.searchItems = result.list;
                    }
                });
            },
            onBtnModify: function(item, e) {
                var v = this;
                item.isModifying = true;
            },
            onBtnDelete: function(item,e) {
                var v = this;
                if( confirm('정말 삭제하실 건가요?') ) {
                    ajaxHelper.postJson('/quizDelete', {sn: item.sn}, function(result) {
                        v.onChangeSearchKeyword();
                    });
                }
            },
            onBtnInsertQuiz: function() {
                if( this.insertQuestion == '' ||
                    this.insAnswer1 == '' ||
                    this.insAnswer2 == '' ||
                    this.insAnswer3 == ''
                ) {
                    alert('비어있는 곳이 있습니다.');
                    return;
                }

                if(confirm('정답이' + (Number(this.insCollectIdx) + 1 ) + '번 맞습니까?')) {
                    var v = this;
                    var packet = {};
                    packet.q = this.insertQuestion;
                    packet.a1 = this.insAnswer1;
                    packet.a2 = this.insAnswer2;
                    packet.a3 = this.insAnswer3;
                    packet.ci = this.insCollectIdx;
                    ajaxHelper.postJson('/quizInsert', packet, function(result) {
                        v.insertQuestion = '';
                        v.insAnswer1 = '';
                        v.insAnswer2 = '';
                        v.insAnswer3 = '';
                        v.insCollectIdx = 0;
                    });
                }
            },
            onModeRadio: function() {
                if( this.rmode == 'add' ) {
                    this.visibleAdd = true;
                    this.visibleSearch = false;
                }else {
                    this.visibleAdd = false;
                    this.visibleSearch = true;
                }
            },
            onRadioChange: function(item) {
                console.log(item.collect_idxM);
            },
            onBtnSendModify: function(item) {
                var v = this;
                var packet = item;
                ajaxHelper.postJson('/quizModify', packet, function(result) {
                    v.onChangeSearchKeyword();
                });
            },
            onBtnCancel: function(item) {
                item.questionM = item.question;
                item.answer1M = item.answer1;
                item.answer2M = item.answer2;
                item.answer3M = item.answer3;
                item.collect_idxM = item.collect_idx;
                item.isModifying = false;
            },
            isModifying: function(item) {
                return item.isModifying;
            }
        }
    });

    this.vApp.isPermitted = ( this.UserInfo.adminMemberVal >= 1 );
}

var G = new GlobalValue();

$(document).ready(function() {
    if( USERINFO ) {
        G.UserInfo = USERINFO.data;
    }
    G.init();
});