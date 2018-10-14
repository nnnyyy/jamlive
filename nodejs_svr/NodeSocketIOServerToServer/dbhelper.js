/**
 * Created by nnnyy on 2018-04-13.
 */
var dbpool = require('./MySQL').init();
var HashMap = require('hashmap');

exports.getServerInfo = function( cb ) {
    try {
        dbpool.query("select * from server_info", function(err, rows) {
            if(err) {
                cb({ret: -1});
                return;
            }
            var data = [];
            for( var i  = 0; i < rows.length ; ++i ) {
                var item = rows[i];
                data.push({name: item.name, limit: item.limit_user_cnt, url: item.url, idx: item.idx });
            }
            cb({ret:0, info: data});
        });
    }catch(err) {
        //Log.logger.debug('DB Failed - getServerInfo');
        cb({ret: -1});
    }
}


exports.updatePermanentBanByNick = function( nick, cb ) {
    try {
        dbpool.query("CALL updatePermanentBanByNick( ? )", [nick], function(err, rows) {
            if(err) {
                console.log('error : ' + err);
                if( cb ) cb({ret: -99});
                return;
            }

            if( cb ) cb({ret: rows[1][0]['ret'] });
        });
    }catch(err) {
        //Log.logger.debug('DB Failed - updatePermanentBanByNick');
        if( cb ) cb({ret: -1});
    }
}

exports.updatePermanentBanByIp = function( ip, cb ) {
    try {
        dbpool.query("CALL updatePermanentBanByIp( ? )", [ip], function(err, rows) {
            if(err) {
                console.log('error : ' + err);
                if( cb ) cb({ret: -99});
                return;
            }

            if( cb ) cb({ret: 0 });
        });
    }catch(err) {
        //Log.logger.debug('DB Failed - updatePermanentBanByIp');
        if( cb ) cb({ret: -1});
    }
}