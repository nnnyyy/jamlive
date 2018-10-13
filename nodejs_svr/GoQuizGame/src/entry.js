/**
 * Created by nnnyyy on 2018-10-12.
 */
import './scss/style.css'
import $ from 'jquery'
import io from 'socket.io-client'
import Vue from 'vue';
import Global from './Global'

$(document).ready(function() {
    Vue.prototype.$bus = new Vue();
    Global.init(io());
});