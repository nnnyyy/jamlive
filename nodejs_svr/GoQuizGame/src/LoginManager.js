/**
 * Created by nnnyy on 2018-10-14.
 */

import Vue from 'vue';
import Global from './Global';
import PT from './common/protocols';
import EProtocol from './common/eventBusProtocol';

export default class LoginManager {
    constructor() {

    }

    onPacket( packet ) {
        Global.vApp.$bus.$emit(EProtocol.SetLoginStateRet, packet);
    }

    sendLogin(id, pw) {
        Global.socket.emit(PT.LOGIN, {id: id, pw: pw});
    }
};