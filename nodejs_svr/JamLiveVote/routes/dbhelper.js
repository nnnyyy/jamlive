/**
 * Created by nnnyy on 2018-04-13.
 */
var Log = require('./Log');
var dbpool = require('./MySQL').init();

exports.signup = function(id, pw, nick, cb) {
    try {
        dbpool.query("CALL signup(?,?,?, @ret); select @ret;", [id, pw, nick] , function(err, rows) {
            if(err) {
                cb({ret: -1});
                return;
            }

            var ret = rows[rows.length - 1][0]['@ret'];
            cb({ret: ret});
        });
    }catch(err) {
        Log.logger.debug('DB Failed - signup');
        cb({ret: -1});
    }
}

exports.login = function(id, pw, cb) {
    cb({id: 'nnnyyy', nick: '왕야옹', ret: 0});
    /*
    try {
        dbpool.query("CALL login(?,?, @ret); select @ret;", [id, pw] , function(err, rows, fields) {
            if(err) {
                cb({ret: -1});
                return;
            }

            var ret = rows[rows.length - 1][0]['@ret'];
            cb({id: 'nnnyyy', nick: '왕야옹', ret: ret});
        });
    }catch(err) {
        Log.logger.debug('DB Failed - login');
        cb({ret: -1});
    }
    */
}

/*
 exports.buyItem = function(id, itemsn, cb) {
 // 가챠 종류와 일반 아이템 종류를 구분하자.
 dbpool.query('CALL  BuyItem(?,?,@ret); select @ret;', [id, itemsn], function(err, rows) {
 if(err) {
 cb({ret: -99});
 return;
 }

 console.log(rows);
 var ret = rows[rows.length - 1][0]['@ret'];
 console.log("buyitem : " + ret);
 cb({ret: ret});
 });
 }

exports.getCouponList = function(id, cb) {
    dbpool.query('CALL GetCouponList(?)', [id], function(err,rows,fields) {
        if(err) {
            cb({ret:-1, err:err});
            return;
        }

        var aData = rows[0];
        var result = [];
        for(var i = 0 ; i < aData.length ; ++i) {
            var data = aData[i];
            result.push({
                sn: data.sn,
                name: data.name,
                iconpath: data.iconpath,
                type: data.type,
                reward: data.reward,
                link: data.link,
                desc: data.desc
            });
        }

        console.log(rows);

        cb({ret:0, list:result});
    });
}
*/