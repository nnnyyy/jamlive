/**
 * Created by nnnyy on 2018-06-06.
 */
String.prototype.hashCode = function() {
    var hash = 0, i, chr;
    if (this.length === 0) return hash;
    for (i = 0; i < this.length; i++) {
        chr   = this.charCodeAt(i);
        hash  = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
};


String.prototype.pad = function( width ){
    return this.length >= width ? this : new Array(width - this.length + 1).join('0') + this;
}