console.log('load app.js');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

var routes = require('./routes/index');
var session = require('express-session');
const redis = require('redis');
const redisStore = require('connect-redis')(session);
const client = redis.createClient();
const ServerManager = require('./server/modules/ServerManager');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

var sessionMiddleware = session({
    secret: 'dhkddPtlra',
    resave: true,
    saveUninitialized: false,
    store: new redisStore({
        host: '127.0.0.1',
        port: 6379,
        client: client,
        prefix: "session-jamlive.net:a",
        db: 0,
        cookie: {
            path: '/',
            domain: '.jamlive.net',
            expires: new Date(Date.now() + 3600000),
            maxAge: 3600000
        }

    })
});

ServerManager.setRedis(client);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
    req.serverMan = ServerManager;
    next();
})

app.use(sessionMiddleware);
app.use('/', routes);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
