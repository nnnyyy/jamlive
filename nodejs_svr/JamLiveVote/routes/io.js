/**
 * Created by nnnyyy on 2018-05-10.
 */
console.log('load io.js');
var ServerManager = require('./ServerManager');

module.exports = function(io) {
    ServerManager.setIO(io);
    io.on('connection', function(socket){
        if( ServerManager.uniqueip.get(socket.handshake.address) != null ) {
            socket.disconnect();
            return;
        }
        ServerManager.register(socket);
    });
}

