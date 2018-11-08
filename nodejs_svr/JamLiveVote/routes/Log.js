/**
 * Created by nnnyyy on 2018-04-12.
 */
var winston = require('winston');
var winstonDaily = require('winston-daily-rotate-file');
var moment = require('moment');

function timeStampFormat() {
    return moment().format('YYYY-MM-DD HH:mm:ss.SSS ZZ');
}

var logger = new (winston.Logger)({
    transports:[
        new (winstonDaily)({
            name: 'info-file',
            filename: './log/info_%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            colorize: false,
            maxsize: 50000000,
            maxFiles: 1000,
            level: 'info',
            showLevel: true,
            json: false,
            timestamp: timeStampFormat
        })
    ]
});

exports.logging = function(req, res, next) {
    if( req.session.userinfo ) {
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        logger.info('connect', req.session.userinfo.usernick , ip, req.session.userinfo.ap);
    }
    next();
}

exports.logger = logger;