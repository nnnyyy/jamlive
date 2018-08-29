/**
 * Created by nnnyyy on 2018-08-29.
 */

var dbhelper = require('../dbhelper');

exports.SearchWord = function( req, res, next ) {
    dbhelper.searchWord( req.body.word, function(result) {
        res.json({ret: result.ret, data: result.data });
    } )
}

exports.Register = function( req, res, next ) {
    if( !req.session.username ) {
        res.json({ret: -99});
        return;
    }
    dbhelper.registerNewWord( req.session.username, req.body.word, req.body.desc , function(result) {
        res.json({ret: result.ret });
    } )
}