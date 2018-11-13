/**
 * Created by nnnyy on 2018-08-20.
 */
const express = require("express");
const app = express();
const http = require('http').Server(app);
const io = require("socket.io")(http);
const ServerManager = require('./modules/ServerManager');
const servman = new ServerManager(io, http);

var path = require('path');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
var session = require('express-session');
const redis = require('redis');
const redisStore = require('connect-redis')(session);
const client = redis.createClient();

//  HTTP Server Setup

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


var sessionMiddleware = session({
    secret: 'dhkddPtlra',
    resave: false,
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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
    req.serverMan = servman;
    next();
})

app.use(sessionMiddleware);

const routes = require('./routes/index');
app.use('/', routes);