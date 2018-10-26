/**
 * Created by nnnyy on 2018-10-19.
 */
'use strict'

const ioclient = require('socket.io-client');
const HashMap = require('hashmap');
const config = require('../../config');

class Center {
    constructor(ServerManager) {
        this.servman = ServerManager;
        if( config.isDebugDB ) {
            this.socket = ioclient.connect('http://localhost:7777', {reconnect: true });
        }
        else {
            this.socket = ioclient.connect('http://localhost:7777', {reconnect: true });
        }

        this.servInfoList = new HashMap();
        this.servnameConvert = new HashMap();
        this.servnameConvert.set('1', 'Server1');
        this.servnameConvert.set('2', 'Server2');
        this.servnameConvert.set('3', 'Server3');
        this.servnameConvert.set('4', 'Server4');
        this.servnameConvert.set('5', 'Server5');
        this.servnameConvert.set('6', 'Server6');
        this.servnameConvert.set('7', 'Server7');
        this.servnameConvert.set('8', 'Server8');
        this.servnameConvert.set('9', 'Server9');
        this.servnameConvert.set('10', 'Server10');
        this.servnameConvert.set('11', 'Server11');
        this.servnameConvert.set('12', 'Server12');
        this.servnameConvert.set('13', 'Server13');
        this.servnameConvert.set('14', 'Server14');
        this.servnameConvert.set('15', 'Server15');
        this.servnameConvert.set('16', 'Server16');

        this.initListener();
    }

    initListener() {
        const center = this;
        // Add a connect listener
        this.socket.on('connect', function () { center.onConnect(); });
    }

    onConnect() {
        const center = this;
        this.socket.emit('serv-info', { type: "route-server", name: config.serv_name });
        this.socket.on('disconnect', function()        { center.onDisconnect(this);            });
        this.socket.on('user-cnt', function(packet)    { center.onUserCnt(this, packet);       });
    }

    onDisconnect( socket ) {
        console.log('disconnect from center');
    }

    onUserCnt( socket, packet ) {
        try {
            const data = packet.data;
            for( var i = 0 ; i < data.length ; ++i ) {
                this.servInfoList.set(data[i].name, {cnt: data[i].cnt, limit: data[i].limit, url: data[i].url, tLastRecv: new Date()});
            }
        }
        catch(e) {
            console.log(e);
        }
    }
}

module.exports = Center;