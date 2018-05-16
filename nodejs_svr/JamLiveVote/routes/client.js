/**
 * Created by nnnyy on 2018-05-10.
 */
var Client = function(socket) {
    this.socket = socket;
    this.tLastClick = 0;
}

Client.prototype.isClickable = function() {
    var cur = new Date();
    return (cur - this.tLastClick) > 2000;
}

module.exports = Client;