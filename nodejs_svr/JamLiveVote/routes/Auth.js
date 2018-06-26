/**
 * Created by nnnyyy on 2018-04-12.
 */
var Log = require('./Log');
var dbhelper = require('./dbhelper');

exports.login = function(req, res, next) {
    dbhelper.login(req.body.id, req.body.pw, function(json) {
        if( json.ret != 0 ){
            res.json(json.ret);
            return;
        }

        req.session.username = json.id;
        req.session.usernick = json.nick;
        req.session.auth = json.auth;
        res.json(json.ret);
    })
}

exports.logout = function(req, res, next) {
    req.session.username = null;
    req.session.usernick = null;
    req.session.auth = null;
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