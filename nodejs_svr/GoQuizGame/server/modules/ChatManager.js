/**
 * Created by nnnyy on 2018-10-13.
 */
'use strict'

class ChatManager {
    constructor(sm) {
        this.sm = sm;
    }

    onPacket( packet ) {
        console.log(packet);
    }
}

module.exports = ChatManager;