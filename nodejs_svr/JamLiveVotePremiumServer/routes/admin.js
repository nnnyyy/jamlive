/**
 * Created by nnnyyy on 2018-04-13.
 */
var Log = require('./Log');
exports.main = function(req, res, next) {
    data = {};
    data.session = req.session.user_id == 'admin' ? 'admin' : null;

    res.render('admin', data);
}


exports.addbet = function(req, res, next) {
    data = {};
    data.session = req.session.user_id == 'admin' ? 'admin' : null;

    res.render('addbet', data);
}