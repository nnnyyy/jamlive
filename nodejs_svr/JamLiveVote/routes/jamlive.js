/**
 * Created by nnnyyy on 2018-05-09.
 */
var Log = require('./Log');
var request = require('request');

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

exports.search = function( req, res, next ) {
    var api_url = 'https://openapi.naver.com/v1/search/kin.json?display=20&query=' + encodeURI(req.body.query); // json ??

    var options = {
        url: api_url,
        headers: {'X-Naver-Client-Id':'RrVyoeWlAzqS736WZDq3', 'X-Naver-Client-Secret': 'ZaMzW0bOM7'}
    };
    try {
        request.get(options, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                res.json(body);
            } else {
                res.json(response.statusCode);
                console.log('error = ' + response.statusCode);
            }
        });
    }
    catch(e){
        console.log(e);
    }

}