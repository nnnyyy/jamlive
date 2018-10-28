/**
 * Created by nnnyyy on 2018-04-12.
 */
var mysql = require('mysql');
var fs = require('fs');
configPath = __dirname + '/../config/config.json';
var parsed = JSON.parse(fs.readFileSync(configPath, 'UTF-8'));
var config = require('../config');

var _pool;
var DBMan = {}

DBMan.init = function() {
    _pool = mysql.createPool({
        connectionLimit: 10,
        host: config.isDebugDB ? '112.168.225.63' : parsed.dbhost,
        user: parsed.user,
        password: parsed.password,
        database: parsed.database,
        multipleStatements: true
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

