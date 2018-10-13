<template>
    <div id="login-area">
        <button @click="onLogin">로그인!</button>
    </div>
</template>

<script>
    import EProtocol from '../common/eventBusProtocol';

    export default {
        name: 'login-area',
        data: function() {
            return {
            }
        },
        created: function() {
        },
        methods: {
            onLogin: function(e) {
                this.$bus.$emit(EProtocol.SetLoginState);
            }
        }
    }
</script>