/**
 * Created by nnnyyy on 2018-04-12.
 */
const mysql = require('mysql');
const fs = require('fs');
configPath = __dirname + '/config/config.json';
const parsed = JSON.parse(fs.readFileSync(configPath, 'UTF-8'));

let _pool;
const DBMan = {}

DBMan.init = function() {
    _pool = mysql.createPool({
        connectionLimit: 10,
        host: parsed.dbhost,
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

