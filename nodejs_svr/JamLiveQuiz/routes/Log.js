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
            filename: './log/server_%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            colorize: false,
            maxsize: 50000000,
            maxFiles: 1000,
            level: 'info',
            showLevel: true,
            json: false,
            timestamp: timeStampFormat
        }),

        new (winston.transports.Console)({
            name: 'Debug-Console',
            colorize: true,
            level: 'debug',
            showLevel: true,
            json: false,
            timestamp: timeStampFormat
        })
    ],
    exceptionHandlers:[
        new (winstonDaily)({
            name: 'exception-file',
            filename: './log/exception_%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            colorize: false,
            maxsize: 50000000,
            maxFiles: 1000,
            level: 'error',
            showLevel: true,
            json: false,
            timestamp: timeStampFormat
        }),

        new (winston.transports.Console)({
            name: 'exception-Console',
            colorize: true,
            level: 'debug',
            showLevel: true,
            json: false,
            timestamp: timeStampFormat
        })
    ]
})

exports.logging = function(req, res, next) {
    if( req.session.user_id )
        logger.info('[' + req.session.user_id + '] Req Url : ' + req.originalUrl);
    next();
}

exports.logger = logger;