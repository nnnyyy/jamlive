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
            searchItems:[]
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