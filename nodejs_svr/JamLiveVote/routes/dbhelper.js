/**
 * Created by nnnyy on 2018-04-13.
 */
var Log = require('./Log');
var dbpool = require('./MySQL').init();
var HashMap = require('hashmap');
var KinMan = require('./modules/KinManager');

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

exports.getRandomWords = function( cb ) {
    try {
        dbpool.query("select * from krdic where type <> 0 order by rand() limit 0,15", function(err, rows) {
            if( err ) {
                cb({ret: -1});
                return;
            }
            var data = [];
            for( var i  = 0; i < rows.length ; ++i ) {
                var d = rows[i];
                data.push({word: d.word, type: d.type});
            }

            cb({ret: 0, words: data});
        })
    }catch(err) {
        Log.logger.debug('DB Failed - getRandomWords');
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
        dbpool.query("select * from quiz_time_table where (( startweek = weekday(now()) ) and starttime >= now()) or (( startweek = weekday(now() + interval 1 day) ) and starttime >= '00:00:00')  order by startweek, starttime limit 1", function(err, rows) {
            if(err) {
                cb({ret: -1});
                return;
            }

            var data = { ret: -1, name: '없습니다', weekday: 0, time: '00:00:00' }

            for( var i  = 0; i < rows.length ; ++i ) {
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
        dbpool.query(`insert into permanent_ban_list ( ip_or_id ) values ('${idorip}')`, function(err, rows) {
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

exports.searchUser = function( nick, cb ) {
    try {
        dbpool.query(`select a.nick, b.ap from account a, active_point b where a.id = b.id and a.nick = '${nick}'`, function(err, rows) {
            if(err) {
                console.log('error : ' + err);
                cb({ret: -99});
                return;
            }

            var data = { ret: -1, nick: '', active_point: 0 }

            for( var i  = 0; i < rows.length ; ++i ) {
                data.ret = 0;
                data.nick = rows[i].nick;
                data.active_point = rows[i].ap;
            }

            cb({ret: 0, data: data});
        });
    }catch( err ) {
        console.log(`[db] search user error - ${err}`);
    }
}


exports.addItem = function( id, itemid, cb ) {
    try {
        dbpool.query("CALL addItem( ?, ?, @ret ); select @ret;", [id, Number(itemid)], function(err, rows) {
            if(err) {
                console.log('error : ' + err);
                cb({ret: -99});
                return;
            }

            var ret = rows[rows.length - 1][0]['@ret'];
            cb({ret: ret });
        });
    }catch(err) {
        Log.logger.debug('DB Failed - addItem');
        cb({ret: -1});
    }
}


exports.updateAuth = function( id, auth, cb ) {
    try {
        dbpool.query("CALL updateAuth( ?, ? )", [id, auth], function(err, rows) {
            if(err) {
                console.log('error : ' + err);
                cb({ret: -99});
                return;
            }

            cb({ret: 0 });
        });
    }catch(err) {
        Log.logger.debug('DB Failed - updateAuth');
        cb({ret: -1});
    }
}


exports.searchWord = function( word, cb ) {
    try {
        dbpool.query(`select sn, word, description, modifiedDate, nick from kin a, account b where b.id = a.modifier_id and word like '%${word}%' limit 10`, function(err, rows) {
            if(err) {
                console.log('error : ' + err);
                cb({ret: -99});
                return;
            }

            let data = [];
            for( var i  = 0; i < rows.length ; ++i ) {
                const item = rows[i];
                data.push( { sn: item.sn, word: item.word, desc: item.description, nick: item.nick, date: item.modifiedDate });
            }

            cb({ret: 0, data: data });
        });
    }catch(err) {
        Log.logger.debug('DB Failed - searchWord');
        cb({ret: -1});
    }
}


exports.registerNewWord = function( id, word, desc, cb ) {
    try {
        dbpool.query("CALL createKinWord( ?, ?, ? )", [id, word, desc], function(err, rows) {
            if(err) {
                console.log('error : ' + err);
                cb({ret: -99});
                return;
            }

            cb({ret: 0 });
        });
    }catch(err) {
        Log.logger.debug('DB Failed - updateAuth');
        cb({ret: -1});
    }
}

exports.modifyKinWord = function( sn, id, desc, cb ) {
    try {
        dbpool.query("CALL modifyKinWord( ?, ?, ? )", [sn, id, desc], function(err, rows) {
            if(err) {
                console.log('error : ' + err);
                cb({ret: -99});
                return;
            }

            cb({ret: 0 });
        });
    }catch(err) {
        Log.logger.debug('DB Failed - updateAuth');
        cb({ret: -1});
    }
}

exports.getKinRecentRegisterList = function( cb ) {
    try {
        dbpool.query(`select word, description, nick from kin k, account a where a.id = k.modifier_id order by modifieddate desc limit 15;`, function(err, rows) {

            if(err) {
                console.log('error : ' + err);
                cb({ret: -99});
                return;
            }

            let data = [];
            for( var i  = 0; i < rows.length ; ++i ) {
                const item = rows[i];
                data.push( { word: item.word, desc: item.description, nick: item.nick });
            }

            cb({ret: 0, data: data });

        });
    }catch(e) {
        Log.logger.debug('DB Failed - getKinRecentRegisterList');
        cb({ret: -1});
    }
}

exports.searchKinWordPerfect = function( query , cb ) {
    try {
        query = query.trim();

        var final = `select * from kin where word = '${query}'`;

        dbpool.query(final, function(err, rows) {
            if(err) {
                cb({ret: -1});
                return;
            }
            var data = [];
            for( var i  = 0; i < rows.length ; ++i ) {
                var item = rows[i];
                KinMan.register(item.word, item.description);
                data.push({word: item.word});
            }
            cb({ret:0, list: data});
        });
    }catch(err) {
        Log.logger.debug('DB Failed - searchKinWordPerfect');
        cb({ret: -1});
    }
}

exports.searchKinWord = function( query , mode,  cb ) {
    try {
        var queries = query.trim().split(' ');
        var queries_backup = queries;
        var question_query = '';
        for( var i = 0 ; i < queries.length ; ++i ) {
            if( queries[i].trim().length <= 1 || KinMan.isExist(queries[i].trim())) {
                continue;
            }
            queries[i] = (mode == 0 ? '' : '%') + queries[i].trim() + '%';
            var t = ('like \'' + queries[i] + '\' ');
            question_query += ('word ' + t);
            if( i != queries.length - 1  ) {
                question_query += ' or ';
            }
        }

        var where = question_query;
        //console.log(where);

        var final = "select * from kin where " + where;
        //console.log( final );

        dbpool.query(final, function(err, rows) {
            if(err) {
                cb({ret: -1});
                return;
            }
            var data = [];
            for( var i  = 0; i < rows.length ; ++i ) {
                var item = rows[i];
                KinMan.register(item.word, item.description);
                data.push({word: item.word});
            }
            cb({ret:0, list: data});
        });
    }catch(err) {
        Log.logger.debug('DB Failed - searchKinWord');
        cb({ret: -1});
    }
}

exports.deleteKinWord = function( sn, cb ) {
    try {
        dbpool.query("CALL deleteKinWord( ? )", [sn], function(err, rows) {
            if(err) {
                console.log('error : ' + err);
                cb({ret: -99});
                return;
            }

            cb({ret: 0 });
        });
    }catch(err) {
        Log.logger.debug('DB Failed - deleteKinWord');
        cb({ret: -1});
    }
}

exports.getBanCnt = function( id, cb ) {
    try {
        dbpool.query("CALL getBanCnt( ? )", [id], function(err, rows) {
            if(err) {
                console.log('error : ' + err);
                cb({ret: -99});
                return;
            }

            cb({ret: 0, cnt: rows[0][0].cnt });
        });
    }catch(err) {
        Log.logger.debug('DB Failed - getBanCnt');
        cb({ret: -1});
    }
}

exports.insertBanUser = function( id, cb ) {
    try {
        dbpool.query("CALL insertBanList( ? )", [id], function(err, rows) {
            if(err) {
                console.log('error : ' + err);
                cb({ret: -99});
                return;
            }

            cb({ret: 0 });
        });
    }catch(err) {
        Log.logger.debug('DB Failed - getBanCnt');
        cb({ret: -1});
    }
}