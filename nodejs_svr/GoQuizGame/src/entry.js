/**
 * Created by nnnyyy on 2018-10-12.
 */
import './scss/style.css'
import $ from 'jquery'
import io from 'socket.io-client'
import Global from './Global'

$(document).ready(function() {
    const G = new Global(io());
});