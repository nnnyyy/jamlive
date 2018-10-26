/**
 * Created by nnnyyy on 2018-10-26.
 */
'use strict'

const Center = require('./Center');

class ServerManager {
    constructor() {
        this.center = new Center(this);
    }
}

module.exports = ServerManager;