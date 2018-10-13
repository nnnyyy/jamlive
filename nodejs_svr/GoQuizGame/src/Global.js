/**
 * Created by nnnyy on 2018-10-12.
 */
import $ from 'jquery';
import QuizManager from './QuizManager';
import ChatManager from './ChatManager';
import LoginManager from './LoginManager';
import Vue from 'vue';
import PT from './common/protocols';

import App from './vueComponent/App.vue';

import EProtocol from './common/eventBusProtocol';

class Global {
    constructor() {
    }

    init(socket) {
        const g = this;

        this.qm = new QuizManager();
        this.cm = new ChatManager();
        this.lm = new LoginManager();
        this.socket = socket;
        this.initSocketListener();

        this.vApp = new Vue({
            el: '#app',
            template: '<App/>',
            created: function() {
            },
            methods: {
            },
            components: {
                App
            }
        });
    }

    initSocketListener() {
        const g = this;
        this.socket.on(PT.QUIZ, p => { g.qm.onPacket( p ) });
        this.socket.on(PT.CHAT, p => {g.cm.onPacket( p ) });
        this.socket.on(PT.LOGIN, p => {g.lm.onPacket( p ) });
        this.socket.emit(PT.SVR.CHAT, {msg: 'Test Message'});
    }
}

const g = new Global();
export default g;