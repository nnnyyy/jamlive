/**
 * Created by nnnyyy on 2018-04-12.
 */
var dbhelper = require('./dbhelper');
var async = require('async');
const ServerManager = require('../server/modules/ServerManager');

exports.login = function(req, res, next) {
    async.waterfall(
        [
            async.apply(requestLogin, req),
            requestBanCnt,
            requestActivePoint,
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
    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress.substr(7);
    dbhelper.login(req.body.id, req.body.pw, ip, function(json) {
        if( json.ret != 0 ){
            //res.json(json.ret);
            callback(json.ret);
            return;
        }

        req.session.username = json.id;
        req.session.userinfo = { usernick: json.nick, auth: json.auth, adminMemberVal: json.adminMemberVal };
        req.session.userinfo.banCnt = 0;
        //res.json(json.ret);
        callback(null,req);
    })
}

function requestBanCnt(req, callback) {
    dbhelper.getBanCnt( req.session.username, function(ret) {
        if( ret.ret == 0 ) {
            //  완료 처리 해줘
            req.session.userinfo.banCnt = ret.cnt;
            callback(null, req);
        }
        else {
            callback(ret.ret);
        }
    })
}

function requestActivePoint(req, callback) {
    dbhelper.getActivePoint( req.session.username, function(ret) {
        if( ret.ret == 0 ) {
            //  완료 처리 해줘
            req.session.userinfo.ap = ret.point;
            if( !req.session.userinfo.ap ) {
                req.session.userinfo.ap = 0;
            }
            const userinfo = JSON.stringify(req.session.userinfo);
            ServerManager.redis.set(req.session.username, userinfo,  (err, info) => {
                callback(null, req);
            });
        }
        else {
            callback(ret.ret);
        }
    })
}

function requestGetItemList(req, callback) {
    req.session.userinfo.items = [1];
    callback(null);
}

exports.logout = function(req, res, next) {
    req.session.destroy();
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