/**
 * Created by nnnyy on 2018-11-10.
 */
'use strict'
const redis = require('redis');
const session = require('express-session');
const redisStore = require('connect-redis')(session);

class RedisManager {
    constructor() {
        this.client = redis.createClient();
        this.sessionMiddleware = session({
            secret: 'dhkddPtlra',
            resave: true,
            saveUninitialized: false,
            store: new redisStore({
                host: '127.0.0.1',
                port: 6379,
                client: this.client,
                prefix: "session-jamlive.net:a",
                db: 0
            })
        });
    }
}

module.exports = RedisManager;