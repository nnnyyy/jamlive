/**
 * Created by nnnyyy on 2018-10-11.
 */
const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const redis = require('redis');
const redisStore = require('connect-redis')(session);
const redisClient = redis.createClient();
const routes = require('./routes/index');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const sessionMiddleware = session( {
    secret: 'goquiz',
    resave: true,
    saveUninitialized: false,
    store: new redisStore({
        host: '127.0.0.1',
        port: '6379',
        client: redisClient,
        prefix: 'goquiz',
        db: 0
    })
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'dist')));
app.use(sessionMiddleware);

app.use('/', routes);

module.exports = app;