<template>
    <div id="quiz-area">
        <div class="msg-area">{{ text }}</div>
        <div class="select-area">
            <ul v-for="item in items">
                <li>{{ ( item.idx + 1 ) }}. {{ item.text }}<button @click="onSelectAnswer($event, item)"> 선택 </button></li>
            </ul>
        </div>
    </div>
</template>

<script>
    export default {
        name: 'quiz-area',
        data: function() {
            return {
                text: '퀴즈쇼!',
                items: [
                    {text: '보기1번 예시', idx: 0},
                    {text: '보기2번 예시', idx: 1},
                    {text: '보기3번 예시', idx: 2}
                ]
            }
        },
        created: function() {
            const v = this;
            this.$bus.$on('test' , function(p) {
                v.text = p.msg;
                v.items = [];
            })
        },
        methods: {
            onSelectAnswer: function(e, item) {
                console.log(item.idx);
            }
        }
    }
</script>