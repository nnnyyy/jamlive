<template>
    <div id="app">
        <top-bar></top-bar>
        <div v-if="logined">
            <quiz-area></quiz-area>
        </div>
        <div v-else>
            <login-area></login-area>
        </div>
    </div>
</template>
<script>
    import QuizArea from './QuizArea.vue'
    import LoginArea from './LoginArea.vue'
    import TopBar from './TopBar.vue'
    import Vue from 'vue';

    import EProtocol from '../common/eventBusProtocol';

    export default {
        name: 'App',
        data: function() {
            return {
                logined: false
            }
        },
        created: function() {
            this.$bus.$on(EProtocol.SetLoginStateRet, this.onBusSetLoginStateRet);
        },
        methods: {
            onBusSetLoginStateRet: function(p) {
                if(p.ret == 0 ) {
                    this.logined = true;
                }
                else {
                    alert('로그인에 실패 했습니다');
                }
            }
        },
        components: {
            'quiz-area': QuizArea,
            'login-area': LoginArea,
            'top-bar': TopBar
        }
    }
</script>