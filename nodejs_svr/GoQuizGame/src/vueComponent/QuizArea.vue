<template>
    <div id="quiz-area">
        <div class="msg-area">{{ text }}</div>
        <div class="select-area">
            <ul v-for="item in items">
                <div style="height: 34px;">
                    <div class="answer-1" style="position: relative;">{{ ( item.idx + 1 ) }}. {{ item.text }}</div>
                    <div class="answer-2" style="position: relative;" @click="onSelectAnswer($event, item)"></div>
                </div>
            </ul>
        </div>
    </div>
</template>

<script>
    export default {
        name: 'quiz-area',
        data: function() {
            return {
                text: '아직 퀴즈쇼가 없습니다! 퀴즈쇼를 등록 해 주세요',
                items: [
                ]
            }
        },
        created: function() {
            const v = this;
        },
        methods: {
            onSelectAnswer: function(e, item) {
                console.log(item.idx);
            }
        }
    }
</script>