/**
 * Created by nnnyyy on 2018-04-12.
 */
var mysql = require('mysql');
var fs = require('fs');
configPath = __dirname + '/../config/config.json';
var parsed = JSON.parse(fs.readFileSync(configPath, 'UTF-8'));

var _pool;
var DBMan = {}

DBMan.init = function() {
    _pool = mysql.createPool({
        connectionLimit: 10,
        host: parsed.dbhost,
        user: parsed.user,
        password: parsed.password,
        database: parsed.database
    });

}

exports.init = function() {
    if( !!_pool ) {
        return _pool;
    }else {
        DBMan.init();
        return _pool;
    }
}

