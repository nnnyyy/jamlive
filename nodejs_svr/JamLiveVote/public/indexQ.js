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
                        v.searchItems = result.list;
                    }
                });
            },
            onBtnModify: function(item, e) {
                var v = this;
                item.isModifying = true;
            }
        }
    });

    this.vApp.isPermitted = ( this.UserInfo.adminMemberVal >= 1 );
}

var G = new GlobalValue();

$(document).ready(function() {
    G.UserInfo = USERINFO.data;
    G.init();
});