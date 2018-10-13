<template>
    <div id="app">
        <quiz-area></quiz-area>
    </div>
</template>
<script>
    import QuizArea from './QuizArea.vue'
    import Vue from 'vue';

    export default {
        name: 'App',
        data: function() {
            return {
            }
        },
        methods: {
        },
        components: {
            'quiz-area': QuizArea
        }
    }
</script>