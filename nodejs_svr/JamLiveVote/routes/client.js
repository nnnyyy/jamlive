/**
 * Created by nnnyy on 2018-05-10.
 */
var Client = function(socket) {
    this.socket = socket;
    this.tLastClick = 0;
}

Client.prototype.isClickable = function() {
    var cur = new Date();
    return (cur - this.tLastClick) > 3500;
}


Client.prototype.isBanedIP = function( hashcode ) {
    
}

module.exports = Client;