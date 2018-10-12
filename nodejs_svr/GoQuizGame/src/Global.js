/**
 * Created by nnnyy on 2018-10-12.
 */
import $ from 'jquery';
import QuizManager from './QuizManager';
import ChatManager from './ChatManager';
import Vue from 'vue';
import PT from './common/protocols';

class Global {
    constructor(socket) {
        const g = this;

        this.qm = new QuizManager();
        this.cm = new ChatManager();
        this.socket = socket;
        this.initSocketListener();

        this.vRoot = new Vue({
            el: '#root',
            data: {
                logined: false
            },
            methods: {
                onBtnLogin: function(e) {
                    this.logined = true;
                }
            }
        })
    }

    initSocketListener() {
        const g = this;
        this.socket.on(PT.QUIZ, p => { g.qm.onPacket( p ) });
        this.socket.on(PT.CHAT, p => { g.cm.onPacket( p ) });
    }
}

export default Global;