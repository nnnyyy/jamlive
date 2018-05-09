/**
 * Created by nnnyyy on 2018-05-09.
 */
var Log = require('./Log');
var cnt = 0;

exports.clickevent = function( req, res, next) {
    try {
        if( req.body.cmd == "add" ) {
            cnt++;
        }
        //Log.logger.debug('click event called - ' +  req.body.cmd);
        res.json({cnt:cnt});
    }catch(err) {
        res.json( {cnt:-1} );
    }
}