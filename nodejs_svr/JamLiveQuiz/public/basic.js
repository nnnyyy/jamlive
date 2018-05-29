/**
 * Created by nnnyy on 2018-05-16.
 */
function isMobile() {
    if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
        // is mobile..
        return true;
    }

    return false;
}

function strip(html)
{
    var tmp = document.createElement("DIV");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}