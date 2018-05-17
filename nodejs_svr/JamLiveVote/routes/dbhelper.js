/**
 * Created by nnnyy on 2018-04-13.
 */
var Log = require('./Log');
var dbpool = require('./MySQL').init();

exports.getQuizDateList = function(cb) {
    try {
        dbpool.query("select sn, quiz_date from quiz_date_list", function(err, rows) {
            if(err) {
                cb({ret: -1});
                return;
            }
            var data = [];
            for( var i  = 0; i < rows.length ; ++i ) {
                var d = rows[i];
                data.push({sn: d.sn, quiz_date: d.quiz_date});
            }
            cb({ret:0, list: data});
        });
    }catch(err) {
        Log.logger.debug('DB Failed - getQuizDateList');
        cb({ret: -1});
    }
}

exports.getQuizList = function(cb) {
    try {
        cb({ret: 0});
    }catch(err) {
        cb({ret: -1})
    }
}