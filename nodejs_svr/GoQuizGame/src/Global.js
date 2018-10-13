/**
 * Created by nnnyy on 2018-10-12.
 */
import $ from 'jquery';
import QuizManager from './QuizManager';
import ChatManager from './ChatManager';
import Vue from 'vue';
import PT from './common/protocols';

import App from './vueComponent/App.vue';

class Global {
    constructor(socket) {
        const g = this;

        this.qm = new QuizManager();
        this.cm = new ChatManager();
        this.socket = socket;
        this.initSocketListener();

        this.vApp = new Vue({
            el: '#app',
            template: '<App/>',
            components: {
                App
            }
        });
    }

    initSocketListener() {
        const g = this;
        this.socket.on(PT.QUIZ, p => { g.qm.onPacket( p ) });
        this.socket.on(PT.CHAT, p => {g.cm.onPacket( p ) });
        this.socket.emit(PT.SVR.CHAT, {msg: 'Test Message'});
    }
}

export default Global;