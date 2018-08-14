/**
 * Created by nnnyyy on 2018-04-12.
 */
var Log = require('./Log');
var dbhelper = require('./dbhelper');
var async = require('async');

exports.login = function(req, res, next) {
    async.waterfall(
        [
            async.apply(requestLogin, req),
            requestGetItemList
        ]
        ,
        function(err){
            if( err == null ) {
                res.json(0);
            }
            else {
                res.json(err);
            }
        });
}

function requestLogin( req, callback ) {
    dbhelper.login(req.body.id, req.body.pw, function(json) {
        if( json.ret != 0 ){
            //res.json(json.ret);
            callback(json.ret);
            return;
        }

        req.session.username = json.id;
        req.session.usernick = json.nick;
        req.session.auth = json.auth;
        //res.json(json.ret);
        callback(null,req);
    })
}

function requestGetItemList(req, callback) {
    req.session.items = [1];
    callback(null);
}

exports.logout = function(req, res, next) {
    req.session.username = null;
    req.session.usernick = null;
    req.session.auth = null;
    req.session.items = null;
    res.json({ret: 0});
}

exports.signup = function( req, res, next) {
    if( req.body.nick == '사이트관리자') {
        res.json({ret: -105});
        return;
    }
    dbhelper.signup(req.body.id, req.body.pw, req.body.nick, function(json) {
        res.json(json);
    })
}