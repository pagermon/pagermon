const express = require('express');
const config = require('../config');

const router = express.Router();

router.use(function(req, res, next) {
        res.locals.login = req.isAuthenticated();
        res.locals.user = req.user || false;
        res.locals.register = config.get('auth:registration');
        res.locals.hidecapcode = config.get('messages:HideCapcode');
        res.locals.pdwmode = config.get('messages:pdwMode');
        res.locals.hidesource = config.get('messages:HideSource');
        res.locals.apisecurity = config.get('messages:apiSecurity');
        res.locals.iconsize = config.get('messages:iconsize');
        res.locals.gaEnable = config.get('monitoring:gaEnable');
        res.locals.gaTrackingCode = config.get('monitoring:gaTrackingCode');
        res.locals.frontPopupEnable = config.get('global:frontPopupEnable');
        res.locals.frontPopupTitle = config.get('global:frontPopupTitle');
        res.locals.frontPopupContent = config.get('global:frontPopupContent');
        res.locals.searchLocation = config.get('global:searchLocation');
        res.locals.monitorName = config.get('global:monitorName');
        next();
});

/* GET home page. */
router.get('/', function(req, res, next) {
        if (config.get('messages:apiSecurity') && !req.isAuthenticated()) {
                req.flash('loginMessage', 'You need to be logged in to access this page');
                res.redirect('/auth/login');
        }

        res.render('index', { pageTitle: 'Home' });
});

module.exports = router;
