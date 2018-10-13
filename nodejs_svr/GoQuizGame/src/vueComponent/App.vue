<template>
    <div id="app">
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
                this.logined = true;
            }
        },
        components: {
            'quiz-area': QuizArea,
            'login-area': LoginArea
        }
    }
</script>