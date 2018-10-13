<template>
    <div id="quiz-area">
        <div class="msg-area">{{ text }}</div>
        <div class="select-area"></div>
    </div>
</template>

<script>
    export default {
        name: 'quiz-area',
        data: function() {
            return {
                text: '퀴즈쇼!'
            }
        },
        created: function() {
            const v = this;
            this.$bus.$on('test' , function(p) {
                v.text = p.msg;
            })
        }
    }
</script>