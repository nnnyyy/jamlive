/**
 * Created by nnnyyy on 2018-10-12.
 */
import './scss/common.css'
import hello from './hello';
import world from './world';
import $ from 'jquery';
import Vue from 'vue';

import test from './test.vue';

$(document).ready(function() {
    new Vue({
        el: '#test',
        render: h => h(test)
    })
});