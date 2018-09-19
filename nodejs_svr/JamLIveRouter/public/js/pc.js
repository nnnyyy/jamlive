/**
 * Created by nnnyy on 2018-09-19.
 */
var animOpacityTimerID = -1;
function showAdminMsg(msg) {
    var obj = $('.admin_msg');
    setVisible(obj, true);
    if( animOpacityTimerID != -1 ) {
        clearTimeout(animOpacityTimerID);
        animOpacityTimerID = -1;
        obj.removeClass('opacity');
        obj.addClass('non_opacity');
    }
    obj.addClass('opacity');
    obj.removeClass('non_opacity');
    obj.html(msg);
    obj.css('opacity', '0.95');
    animOpacityTimerID = setTimeout(function() {
        setVisible(obj, false);
        //$('.admin_msg').css('opacity', '0');
    }, 1500);

}

function setVisible(elem, visible) {
    elem.css('display', visible ? 'inline-block' : 'none');
}

function setVisibleBlock(elem, visible) {
    elem.css('display', visible ? 'block' : 'none');
}

function getVisible(elem) {
    if( elem.css('display') === 'none' ) return false;

    return true;
}

var GlobalValue = function(){
}

var G = new GlobalValue();

function init() {
    var obj = $('.admin_msg');
    setVisible(obj, false);

    $('.btn-serv').each(function(idx) {
        var servidx = $(this).attr('servidx');
        $(this).click(function(e) {
            e.stopPropagation();
            $.ajax({
                type: 'POST',
                dataType: 'json',
                data: JSON.stringify({
                    servidx: servidx
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
        })
    });
}