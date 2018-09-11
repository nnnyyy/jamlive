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
    $('#btn-send').click(function(e) {
        var msg = $('#ip-msg').val();
        if( msg.trim() == '' ) return;
        ajaxHelper.postJson('/msg', { msg: msg }, null);
        $('#ip-msg').val('');
    })
}