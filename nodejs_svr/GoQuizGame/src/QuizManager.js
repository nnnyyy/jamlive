/**
 * Created by nnnyyy on 2018-10-12.
 */

import Vue from 'vue';

export default class QuizManager {
    constructor() {
        this.vArea = new Vue({
            el: '#quiz-area',
            data: {
                msg: '예정 중인 퀴즈 쇼가 없습니다'
            },
            methods: {
                setMsg: function(msg) {
                    this.msg = msg;
                }
            }
        });
    }

    onPacket( packet ) {

    }
};