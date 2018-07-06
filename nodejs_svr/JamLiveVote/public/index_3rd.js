/**
 * Created by nnnyy on 2018-07-06.
 */
var socket = io();

function setSocketListener() {
    socket.on('vote_data', onProcessVoteData);
}

function setBtnListener() {
    $('wnd[role="settings"]').css('display', 'none');
    $('#btn-settings').click(onBtnSettings);
}

function setMinVoteSliderListener() {
    var min_vote_val = localStorage.getItem('min_vote') || 0;
    $('.min_vote_slider').slider({
        range: "min",
        value: 0,
        min: 0,
        max: 10,
        slide: function( event, ui ) {
            localStorage.setItem('min_vote', ui.value);
            $( "min_vote" ).text( ui.value );
        }
    });

    $('.min_vote_slider').slider('value', min_vote_val);
    $( "min_vote" ).text( min_vote_val );

    var max_vote_dupl = localStorage.getItem('max_vote_dupl') || 0;
    $('.cb_max_vote_duplicate').attr('checked', max_vote_dupl == 1 ? true : false );
    $('.cb_max_vote_duplicate').change(function() {
        if( $(this).is(':checked') ) {
            localStorage.setItem('max_vote_dupl', 1);
        }
        else {
            localStorage.setItem('max_vote_dupl', 0);
        }
    })
}

function onProcessVoteData(data) {
    var votedata = data.vote_data;
    var users = votedata.users;
    //$('vote_user_cnt').text(users);
    //$('vote_except').text(votedata.bans);

    var total = [0,0,0];
    for( var i = 0 ; i < votedata.cnt.length ; ++i ) {
        total[i] += votedata.cnt[i];
    }

    /*
    if( !isShowMemberVoteOnly() ) {
        for( var i = 0 ; i < votedata.guest_cnt.length ; ++i ) {
            total[i] += votedata.guest_cnt[i];
        }
    }
    */

    var totalCnt = 0;
    var maxVoteCnt = 0;
    for( var i = 0 ; i < total.length ; ++i ) {
        totalCnt += total[i];
        if( maxVoteCnt <= total[i]) {
            maxVoteCnt = total[i];
        }
    }

    var duplicatedMaxVoteCnt = 0;
    for( var i = 0 ; i < total.length ; ++i ) {
        if( maxVoteCnt == total[i] ) {
            duplicatedMaxVoteCnt++;
        }
    }

    /*
    if( isMaxVoteDuplicateChecked() && duplicatedMaxVoteCnt >= 2 ) {
        total = [0,0,0];
    }


    var minVoteVal = Number($('min_vote').text());

    if( totalCnt <= minVoteVal) {
        total = [0,0,0];
    }
     */

    showBarChart('.ct-chart',['1번','2번','3번'],[total], {
        seriesBarDistance: 10,
        height: 180,
        axisX: {
            offset: 20
        },
        axisY: {
            offset: 20
        }
    });
/*
    var others = data.others;
    for( var i = 0 ; i < others.length ; ++i ) {
        if( others[i].channel == "chat" ) {
            onChat(others[i].data);
        }
    }
*/
}

function onBtnSettings(e) {
    e.stopPropagation();
    var settingsWnd = $('wnd[role="settings"]');
    settingsWnd.css('display','inline-block');

    settingsWnd.click(function(e) {
        e.stopPropagation();
    })

    $(window).click(function() {
        settingsWnd.animate({
            left: "-=300"
        }, 300, function() {
            // Animation complete.
            $(window).unbind('click');
        });
    })

    settingsWnd.animate({
        left: "+=300"
    }, 300, function() {
        // Animation complete.
    });
}

function getGradeImage( auth, isbaned ) {
    return "/images/star.png";
}

function addChat( mode, isbaned, hash , name, msg, bStrip,auth, ip ) {
    var li =    '<li>' +
                '<div type="msg-obj">' +
                '<div type="nick" '+ hash +'><img type="grade" src="' + getGradeImage(auth, isbaned) +'"/>' + name +'<ip>(' + ip + ')</ip></div>' +
                '<div type="msg">' + ( bStrip ? strip(msg) : msg ) + '</div>' +
                '</div>' +
                '</li>';

    var bAutoMoveToBottom = false;
    var chatwndheight = $('.chat-ui').height();

    if( $('.chat-ui').find('li').length > 300 ) {
        $('.chat-ui').find('li').eq(0).remove();
    }

    if( ($('.chat-ui').get(0).scrollTop == ($('.chat-ui').get(0).scrollHeight - chatwndheight) ) ||
        $('#cb_auto_scroll').is(':checked')) {
        bAutoMoveToBottom = true;
    }

    $('.chat-ui').append(li);

    //  끝 정렬
    if( bAutoMoveToBottom )
        $('.chat-ui').scrollTop($('.chat-ui').get(0).scrollHeight);

}

function isMaxVoteDuplicateChecked() {
    if($('.cb_max_vote_duplicate').is(':checked')) {
        return true;
    }

    return false;
}

function isShowMemberVoteOnly() {
    if($('.cb_show_member_vote_only').is(':checked')) {
        return true;
    }

    return false;
}