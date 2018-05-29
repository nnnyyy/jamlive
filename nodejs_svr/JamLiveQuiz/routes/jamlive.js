/**
 * Created by nnnyyy on 2018-05-09.
 */
var Log = require('./Log');
function VoteObj() {
    this.countlist = [0,0,0];
}

VoteObj.prototype.getCount = function(idx) {
    return this.countlist[idx];
}

VoteObj.prototype.incCount = function(idx) {
    this.countlist[idx]++;
}

VoteObj.prototype.getJson = function() {
    return [{cnt:this.countlist[0]},{cnt:this.countlist[1]},{cnt:this.countlist[2]} ]
}

var data = new VoteObj();

exports.clickevent = function( req, res, next) {
    try {
        if( req.body.cmd == "add" ) {
            data.incCount(req.body.votenum);
            res.json(data.getJson());
        }
        else {
            res.json(data.getJson());
        }
        //Log.logger.debug('click event called - ' +  req.body.cmd);

    }catch(err) {
        res.json( {cnt:[]} );
    }
}