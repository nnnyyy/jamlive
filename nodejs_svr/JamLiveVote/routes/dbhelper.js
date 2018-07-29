/**
 * Created by nnnyy on 2018-04-13.
 */
var Log = require('./Log');
var dbpool = require('./MySQL').init();
var HashMap = require('hashmap');

exports.signup = function(id, pw, nick, cb) {
    try {
        dbpool.query("CALL signup(?,?,?, @ret); select @ret;", [id, pw, nick] , function(err, rows) {
            if(err) {
                cb({ret: -99});
                return;
            }

            var ret = rows[rows.length - 1][0]['@ret'];
            cb({ret: ret});
        });
    }catch(err) {
        Log.logger.debug('DB Failed - signup');
        cb({ret: -99});
    }
};

exports.login = function(id, pw, cb) {
    try {
        dbpool.query("CALL login(?,?, @ret); select @ret;", [id, pw] , function(err, rows) {
            if(err) {
                console.log('error : ' + err);
                cb({ret: -99});
                return;
            }

            var ret = rows[rows.length - 1][0]['@ret'];
            var data = rows[0][0];
            cb({id: data.id, nick: data.nick, auth: data.auth_state, ret: ret});
        });
    }catch(err) {
        Log.logger.debug('DB Failed - login');
        cb({ret: -99});
    }
}

exports.getRandomQuiz = function( cb ) {
    try {
        dbpool.query("select * from quiz where quiz_idx >= 4 order by rand() limit 0,1", function(err, rows) {
            if(err) {
                cb({ret: -1});
                return;
            }
            var data = [];
            for( var i  = 0; i < rows.length ; ++i ) {
                var d = rows[i];
                data.push({idx: d.quiz_idx, question: d.question ,answer: [d.answer1, d.answer2, d.answer3], collect: d.collect_idx});
            }
            cb({ret:0, quizdata: data[0]});
        });
    }catch(err) {
        Log.logger.debug('DB Failed - getQuizDateList');
        cb({ret: -1});
    }
}

exports.search = function( query , cb ) {
    try {
        var queries = query.trim().split(' ');
        var queries_backup = queries;
        var question_query = '';
        var answer1_query = '';
        var answer2_query = '';
        var answer3_query = '';
        for( var i = 0 ; i < queries.length ; ++i ) {
            queries[i] = '%' + queries[i].trim() + '%';
            var t = ('like \'' + queries[i] + '\' ');
            question_query += ('question ' + t);
            answer1_query += ('answer1 ' + t);
            answer2_query += ('answer2 ' + t);
            answer3_query += ('answer3 ' + t);
            if( i != queries.length - 1  ) {
                question_query += ' or ';
                answer1_query += ' or ';
                answer2_query += ' or ';
                answer3_query += ' or ';
            }
        }

        var where = question_query + ' or ' + answer1_query + ' or ' + answer2_query + ' or ' + answer3_query;
        //console.log(where);

        var final = "select * from quiz where " + where;
        //console.log( final );

        dbpool.query(final, function(err, rows) {
            if(err) {
                cb({ret: -1});
                return;
            }
            var data = [];
            for( var i  = 0; i < rows.length ; ++i ) {
                var d = rows[i];
                data.push({idx: d.quiz_idx, question: d.question ,answer: [d.answer1, d.answer2, d.answer3], collect: d.collect_idx});
            }
            cb({ret:0, queries: queries_backup, quizdatalist: data});
        });
    }catch(err) {
        Log.logger.debug('DB Failed - search');
        cb({ret: -1});
    }
}

exports.getActivePoint = function( id, cb ) {
    try {
        dbpool.query("CALL getActivePoint( ?, @point ); select @point;", [id], function(err, rows) {
            if(err) {
                console.log('error : ' + err);
                cb({ret: -99});
                return;
            }

            var point = rows[rows.length - 1][0]['@point'];
            cb({ret: 0, point: point});
        });
    }catch(err) {
        Log.logger.debug('DB Failed - getActivePoint');
        cb({ret: -1});
    }
}

exports.updateActivePoint = function( id, ap, cb ) {
    try {
        dbpool.query("CALL updateActivePoint( ?, ? );", [id, ap], function(err, rows) {
            if(err) {
                console.log('error : ' + err);
                cb({ret: -99});
                return;
            }

            cb({ret: 0});
        });
    }catch(err) {
        Log.logger.debug('DB Failed - updateActivePoint');
        cb({ret: -1});
    }
}

exports.getNextQuizshowTime = function( cb ) {
    try {
        dbpool.query("select * from quiz_time_table where (( startweek = weekday(now()) ) and starttime >= now()) or (( startweek = weekday(now() + interval 1 day) ) and starttime >= '00:00:00')  order by starttime limit 1", function(err, rows) {
            if(err) {
                cb({ret: -1});
                return;
            }

            var data = { ret: -1, name: '없습니다', weekday: 0, time: '00:00:00' }

            for( var i  = 0; i < rows.length ; ++i ) {
                console.log(rows[i]);
                data.ret = 0;
                data.name = rows[i].name;
                data.time = rows[i].starttime;
                data.weekday = rows[i].startweek;
            }

            cb({ret: 0, data: data});
        });
    }catch(err) {
        Log.logger.debug('DB Failed - getPermanentBanList');
        cb({ret: -1});
    }
}

exports.getPermanentBanList = function(cb) {
    try {
        dbpool.query("select * from permanent_ban_list", function(err, rows) {
            if(err) {
                cb({ret: -1});
                return;
            }
            var data = new HashMap();
            for( var i  = 0; i < rows.length ; ++i ) {
                var d = rows[i];
                data.set(d.ip_or_id, 1);
            }

            cb({ret: 0, list: data});
        });
    }catch(err) {
        Log.logger.debug('DB Failed - getPermanentBanList');
        cb({ret: -1});
    }
}
exports.updateBanUser = function( idorip, cb ) {
    try {
        dbpool.query("insert into permanent_ban_list values ('" + idorip + "')", function(err, rows) {
            if(err) {
                console.log('error : ' + err);
                cb({ret: -99});
                return;
            }

            cb({ret: 0});
        });
    }catch(err) {
        Log.logger.debug('DB Failed - updateBanUser');
        cb({ret: -1});
    }
}