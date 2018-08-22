/**
 * Created by nnnyyy on 2018-05-10.
 */
var ServerManager = require('./ServerManager');

module.exports = function(io, redisClient) {
    ServerManager.setIO(io, redisClient);
    io.on('connection', function(socket){
        /*
        if( ServerManager.uniqueip.get(socket.handshake.address) != null ) {
            socket.disconnect();
            return;
        }
        */
        ServerManager.register(socket);
    });
}

