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
            resave: false,
            saveUninitialized: false,
            store: new redisStore({
                host: '127.0.0.1',
                port: 6379,
                client: client,
                prefix: "session-jamlive.net:a",
                db: 0,
                cookie:?{
                    path:?'/',
                    domain:?'.jamlive.net',
                    expires:?new?Date(Date.now()?+?3600000),
                    maxAge:?3600000
                }

            })
        });
    }
}

module.exports = RedisManager;