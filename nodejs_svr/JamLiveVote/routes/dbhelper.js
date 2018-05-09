/**
 * Created by nnnyy on 2018-04-13.
 */
var Log = require('./Log');
var dbpool = require('./MySQL').init();

exports.CheckLogin = function(_id, _pw, cb) {
    Log.logger.debug('Check Login Start..');
    dbpool.query('select * from Account', function(err, rows){
        Log.logger.debug('select length : ' + rows.length );
        if( err ){
            Log.logger.debug('Check Login Error..');
            cb(-1);
            return;;
        }
        Log.logger.debug('Check Login Success..');
        cb(0);
    })
}

exports.GetList = function(cb) {
    data = {}

    data.list = [
        {sn: 0, home: '장민석', away: '문희대', home_rate: 187, away_rate: 174, regdate: '2018-04-13 6:00:00', betlimitdate: '2018-04-13 7:00:00', state: 2 },
        {sn: 1, home: '신동휘', away: '왕예식', home_rate: 187, away_rate: 174, regdate: '2018-04-13 10:00:00',betlimitdate: '2018-04-13 7:00:00', state: 0 },
        {sn: 2, home: '신동규', away: '박건희', home_rate: 187, away_rate: 174, regdate: '2018-04-13 10:00:00', betlimitdate: '2018-04-13 7:00:00', state: 0 }
    ];
    cb(data);
}