/**
 * Created by nnnyy on 2018-04-13.
 */
var dbpool = require('./MySQL').init();

exports.signup = function(id, pw, nick, cb) {
    try {
        dbpool.query("CALL signup(?,?,?, @ret); select @ret;", [id, pw, nick] , function(err, rows) {
            if(err) {
                console.log(err);
                cb({ret: -99});
                return;
            }

            var ret = rows[rows.length - 1][0]['@ret'];
            cb({ret: ret});
        });
    }catch(err) {
        cb({ret: -99});
    }
};

exports.login = function(id, pw, ip, cb) {
    try {
        dbpool.query("CALL login(?,?,?, @ret); select @ret;", [id, pw, ip] , function(err, rows) {
            if(err) {
                console.log('error : ' + err);
                cb({ret: -99});
                return;
            }

            var ret = rows[rows.length - 1][0]['@ret'];
            var data = rows[0][0];
            var apData = rows[1];
            cb({id: data.id, nick: data.nick, auth: data.auth_state, adminMemberVal: data.adminMemberVal, ap: apData, ret: ret});
        });
    }catch(err) {
        cb({ret: -99});
    }
};

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
};

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
};