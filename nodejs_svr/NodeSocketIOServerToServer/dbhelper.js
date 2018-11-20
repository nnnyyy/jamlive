/**
 * Created by nnnyy on 2018-04-13.
 */
var dbpool = require('./MySQL').init();
var HashMap = require('hashmap');

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

exports.updateServerLimit = function( name, limit, cb ) {
    try {
        dbpool.query("CALL updateServerLimit( ?, ? )", [name, limit], function(err, rows) {
            if(err) {
                console.log('error : ' + err);
                if( cb ) cb({ret: -99});
                return;
            }

            if( cb ) cb({ret: 0 });
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

exports.addAdminCmdLog = function( id, nick, act, contents, cb ) {
    try {
        dbpool.query("CALL addAdminLog( ?, ?, ?, ? )", [id, nick, act, contents], function(err, rows) {
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

exports.getAdminCmdLog = function(page, cb) {
    try {
        dbpool.query("CALL getAdminLog(?)", [page], function(err, rows) {
            if(err) {
                console.log('error : ' + err);
                if( cb ) cb({ret: -99});
                return;
            }

            const list = rows[0];

            if( cb ) cb({ret: 0, list: list });
        });
    }catch(err) {
        //Log.logger.debug('DB Failed - updatePermanentBanByIp');
        if( cb ) cb({ret: -1});
    }
}