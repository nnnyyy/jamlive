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

//  HTTP Server Setup

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
    req.serverMan = servman;
    next();
})

const routes = require('./routes/index');
app.use('/', routes);