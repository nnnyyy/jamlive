/**
 * Created by nnnyyy on 10/27/2018.
 */
var G;

function init(logined) {
    console.log('mobile init');
    G = new Global(logined);
}


var Global = function(logined) {
    this.vApp = new Vue({
        el: '#app',
        data: {
            tab: 1
        },
        methods: {
            onTab: function(tab) {
                this.tab = tab;
            }
        }
    });
};