/**
 * Created by nnnyy on 2018-11-09.
 */
var dbhelper = require('../dbhelper');
var async = require('async');

exports.login = function(req, res, next) {
    async.waterfall(
        [
            async.apply(requestLogin, req),
            requestBanCnt
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
        req.session.userinfo = { usernick: json.nick, auth: json.auth, adminMemberVal: json.adminMemberVal, ap: json.ap };
        req.session.userinfo.banCnt = 0;
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

