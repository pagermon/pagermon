var conf_file = './config/config.json';
var express = require('express');
var router = express.Router();
var passport = require('passport');
var nconf = require('nconf');
nconf.file({file: conf_file});
nconf.load();

require('../config/passport')(passport); // pass passport for configuration

router.use(function (req, res, next) {
  res.locals.login = req.isAuthenticated();
  res.locals.user = req.user || '';
  res.locals.hidesource = nconf.get('messages:HideSource');
  res.locals.hidecapcode = nconf.get('messages:HideCapcode');
  res.locals.hidedate = nconf.get('hide:date');
  res.locals.hidetime = nconf.get('hide:time');
  res.locals.hidesourcecol = nconf.get('hide:source');
  res.locals.hidecapcodecol = nconf.get('hide:capcode');
  res.locals.hideicon = nconf.get('hide:icon');
  res.locals.hidealias = nconf.get('hide:alias');
  res.locals.hidemessage = nconf.get('hide:message');
  res.locals.colnamedate = nconf.get('columnName:date');
  res.locals.colnametime = nconf.get('columnName:time');
  res.locals.colnamesource = nconf.get('columnName:source');
  res.locals.colnamecapcode = nconf.get('columnName:capcode');
  res.locals.colnameicon = nconf.get('columnName:icon');
  res.locals.colnamealias = nconf.get('columnName:alias');
  res.locals.colnamemessage = nconf.get('columnName:message');
  res.locals.pdwmode = nconf.get('messages:pdwMode');
  res.locals.apisecurity = nconf.get('messages:apiSecurity');
  res.locals.iconsize = nconf.get('messages:iconsize');
  res.locals.gaEnable = nconf.get('monitoring:gaEnable');
  res.locals.gaTrackingCode = nconf.get('monitoring:gaTrackingCode');
  next();
});

router.route('/login')
    .get(function(req, res, next) {
        var user = '';
        if (typeof req.user != 'undefined') {
            user = req.user;
        }
       res.render('login', { 
           title: 'PagerMon - Login',
           message: req.flash('loginMessage'),
           user: user
       }); 
    })
    // process the login form
    .post(passport.authenticate('local-login', {
        successRedirect : '/admin', // redirect to the secure profile section
        failureRedirect : '/login?=login_failed', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));
    
router.route('/logout')
    .get(function(req, res, next) {
        req.logout();
        res.redirect('/');
    });

router.get('/testLogin', isLoggedIn, function(req, res) {
        console.log(req.user);
        res.render('index', {
            user : req.user, // get the user out of session and pass to template
            title: 'PagerMon'
        });
    });
    
/* GET home page. */
router.get('/', function(req, res, next) {
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
