/**
 * Created by nnnyy on 2018-10-14.
 */
var dbpool = require('./modules/MySQL').init();

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
            cb({id: data.id, nick: data.nick, auth: data.auth_state, adminMemberVal: data.adminMemberVal, ret: ret});
        });
    }catch(err) {
        cb({ret: -99});
    }
}