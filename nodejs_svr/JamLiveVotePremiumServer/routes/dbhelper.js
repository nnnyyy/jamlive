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