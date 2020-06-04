var confFile = './config/config.json';
var express = require('express');
var router = express.Router();
var nconf = require('nconf');
nconf.file({ file: confFile });
nconf.load();

const authHelpers = require('../auth/_helpers');
const passport = require('../auth/local');

router.use(function (req, res, next) {
    res.locals.login = req.isAuthenticated();
    res.locals.user = req.user || false;
    res.locals.register = nconf.get('auth:registration')
    res.locals.hidecapcode = nconf.get('messages:HideCapcode');
    res.locals.pdwmode = nconf.get('messages:pdwMode');
    res.locals.hidesource = nconf.get('messages:HideSource');
    res.locals.apisecurity = nconf.get('messages:apiSecurity');
    res.locals.iconsize = nconf.get('messages:iconsize');
    res.locals.gaEnable = nconf.get('monitoring:gaEnable');
    res.locals.gaTrackingCode = nconf.get('monitoring:gaTrackingCode');
    res.locals.frontPopupEnable = nconf.get('global:frontPopupEnable');
    res.locals.frontPopupTitle = nconf.get('global:frontPopupTitle');
    res.locals.frontPopupContent = nconf.get('global:frontPopupContent');
    res.locals.searchLocation = nconf.get('global:searchLocation');
    res.locals.monitorName = nconf.get("global:monitorName");
    next();
});

/* GET home page. */
router.get('/', function (req, res, next) {
    if (nconf.get('messages:apiSecurity') && !req.isAuthenticated()) {
        req.flash('loginMessage', 'You need to be logged in to access this page');
        res.redirect('/auth/login');
    }

    res.render('index', { pageTitle: 'Home' });
});

module.exports = router;
