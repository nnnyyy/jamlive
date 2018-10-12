/**
 * Created by nnnyy on 2018-10-12.
 */
import Vue from 'vue';

export default class ChatManager {
    constructor() {
        this.vUserArea = new Vue({
            el: '#user-area',
            data: {

            }
        });
    }

    onPacket( packet ) {

    }
};