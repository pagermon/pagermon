var conf_file = './config/config.json';
var express = require('express');
var router = express.Router();
var nconf = require('nconf');
nconf.file({file: conf_file});
nconf.load();

const authHelpers = require('../auth/_helpers');
const passport = require('../auth/local');

router.use(function (req, res, next) {
  res.locals.login = req.isAuthenticated();
  res.locals.user = req.user || '';
  res.locals.hidecapcode = nconf.get('messages:HideCapcode');
  res.locals.hidesource = nconf.get('messages:HideSource');
  res.locals.apisecurity = nconf.get('messages:apiSecurity');
  res.locals.iconsize = nconf.get('messages:iconsize')
  next();
});

/* GET home page. */
router.get('/', function(req, res, next) {

    if(nconf.get('messages:apiSecurity') && !req.isAuthenticated()){
        res.redirect('/auth/login');
    }
    res.render('index', { title: 'PagerMon' });
});

module.exports = router;

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    res.redirect('/login');
}
