/**
 * Created by nnnyyy on 2018-08-29.
 */

var dbhelper = require('../dbhelper');

exports.SearchWord = function( req, res, next ) {
    dbhelper.searchWord( req.body.word, function(result) {
        res.json({ret: result.ret, data: result.data });
    } )
}