<template>
    <div id="login-area">
        <table>
            <tr>
                <td>아이디</td>
                <td><input type="text" v-model="id"></td>
            </tr>
            <tr>
                <td>비밀번호</td>
                <td><input type="password" v-model="pw"></td>
            </tr>
            <tr class="btn">
                <td colspan="2"><button @click="onLogin" id="btnLogin">로그인 하기</button></td>
            </tr>
        </table>

    </div>
</template>

<script>
    import EProtocol from '../common/eventBusProtocol';
    import {CheckID, CheckPW} from '../common/basic';
    import Global from '../Global';

    export default {
        name: 'login-area',
        data: function() {
            return {
                id:'',
                pw:''
            }
        },
        created: function() {
        },
        methods: {
            onLogin: function(e) {
                if( !CheckID(this.id) ) {
                    return;
                }

                if( !CheckPW(this.pw)) {
                    return;
                }
                Global.lm.sendLogin(this.id, this.pw);
                //this.$bus.$emit(EProtocol.SetLoginState, );
            }
        }
    }
</script>