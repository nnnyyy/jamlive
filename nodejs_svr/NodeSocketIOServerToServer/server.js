/**
 * Created by nnnyy on 2018-08-20.
 */
const app = require("express")();
const http = require('http').Server(app);
const io = require("socket.io")(http);
const ServerManager = require('./modules/ServerManager');
const servman = new ServerManager(io, http);