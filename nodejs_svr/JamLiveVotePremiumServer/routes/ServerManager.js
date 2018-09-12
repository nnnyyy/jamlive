/**
 * Created by nnnyy on 2018-05-10.
 */

'use strict'

var HashMap = require('hashmap');
var Client = require('./client');
require('./StringFunction');
var dbhelper = require('./dbhelper');

const config = require('../config');
const ConnectToCenter = require('./modules/ConnectToCenter');
const ClientSocket = require('./modules/ClientSocket');

var VOTEPERTIME = 1000;
var BANTIME = 6 * 60 * 1000;
var SEARCHTIME = 8 * 1000;
var BANCNT = 4;

class ServerMan {
    constructor(io, redis) {
        const servman = this;

        this.io = io;
        this.redis = redis;
        this.clients = new HashMap();
        this.connectToCenter = new ConnectToCenter(this.io);

        this.io.on('connection', function(socket){
            servman.register(socket);
        });

        setInterval(function() {
            servman.updateFast();
        }, 400);

        setInterval(function() {
            servman.updateSlow();
        }, 3000);


    }

    register( socket ) {
        const servman = this;
        this.clients.set( socket.id, new ClientSocket(socket) );
        socket.on('disconnect', function() {
            servman.clients.delete(socket.id);
        });
    }

    updateFast() {
        let cur = new Date();
    }

    updateSlow() {
        const cur = new Date();
    }
}

module.exports = ServerMan;
