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
                data.push({name: item.name, limit: item.limit_user_cnt, url: item.url});
            }
            cb({ret:0, info: data});
        });
    }catch(err) {
        //Log.logger.debug('DB Failed - getServerInfo');
        cb({ret: -1});
    }
}