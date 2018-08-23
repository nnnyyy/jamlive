/**
 * Created by nnnyyy on 2018-08-23.
 */
var i18n = require('i18n');

i18n.configure({
    locales:['ko', 'en', 'jp'],
    directory: __dirname + '/locales',
    defaultLocale: 'ko',
    cookie: 'lang',
});

module.exports = function(req, res, next) {
    i18n.init(req,res);
    res.locals.__ = res.__;
    var current_locale = i18n.getLocale();
    return next();
};
