/**
 * Created by nnnyyy on 2018-10-12.
 */
import './scss/common.css'
import $ from 'jquery';
import Vue from 'vue';
import {QuizManager} from './QuizManager'
import io from 'socket.io-client'

$(document).ready(function() {
    const socket = io();
});