/**
 * Created by nnnyy on 2018-10-03.
 */
    'use strict'
class GlobalHintMan {
    constructor(servman) {
        this.servman = servman;
        this.isModifying = false;
        this.modifier = '';
        this.provider = '';
        this.hint = '';
        this.PACKET_PREFIX = 'global-hint';

        this.servman.redis.get('jamlive-global-hint',  (err, info) => {
            try {
                if( !err ) {
                    const memoinfo = JSON.parse(info);
                    this.hint = memoinfo.memo;
                    this.provider = memoinfo.provider;

                    console.log('global-hint loaded');
                }
            }catch(e) {

            }
        } );
    }

    checkCancel( socketid, nick ) {
        if( this.isModifying && this.modifier == nick ) {
            this.cancel(socketid);
        }
    }

    cancel( id ) {
        this.isModifying = false;
        this.modifier = '';
        this.broadcastPacket({id: id, mode: 'cancel'});
    }

    onPacket( fromDistSvr, packet ) {
        switch(packet.mode) {
            case 'isUsable':
            {
                //  사용중인지 확인할 때
                if(this.isModifying) {
                    const oPacket = {id: packet.id, mode: packet.mode, ret: -1, desc: { modifier: this.modifier, isAbleModify: false }}
                    fromDistSvr.sendPacket( this.PACKET_PREFIX, oPacket );
                }
                else {
                    this.isModifying = true;
                    this.modifier = packet.nick;
                    const oPacket = {id: packet.id, mode: packet.mode, ret: 0, desc: { modifier: this.modifier, isAbleModify: true }}
                    this.broadcastPacket( oPacket );
                }
                break;
            }

            case 'cancel':
            {
                this.checkCancel(packet.id, packet.nick);
                break;
            }

            case 'set':
            {
                this.hint = packet.memo;
                this.provider = packet.nick;
                const memoinfo = JSON.stringify({memo: packet.memo, provider: packet.nick });
                this.servman.redis.set('jamlive-global-hint', memoinfo,  (err, info) => {
                    console.log('global-hint saved...');
                } );

                this.isModifying = false;
                this.modifier = '';

                const oPacket = {id: packet.id, mode: packet.mode, ret: 0, desc: { hint: this.hint, provider: this.provider } };
                this.broadcastPacket( oPacket );

                break;
            }
        }
    }

    broadcastPacket( packet ) {
        const protocol = this.PACKET_PREFIX;
        const mVoteServer = this.servman.getVoteServerMap();
        mVoteServer.forEach(function(value, key) {
            const distServer = value;
            if( distServer && distServer.socket ) {
                distServer.socket.emit(protocol, packet);
            }
        })
    }

    sendInitPacket( fromDistSvr ) {
        const oPacket = {id: '', mode: 'set', ret: 0, desc: { hint: this.hint, provider: this.provider } };
        fromDistSvr.sendPacket( this.PACKET_PREFIX, oPacket );
    }
}

module.exports = GlobalHintMan;