var express = require('express');
var bodyParser = require('body-parser');
var router = express.Router();
//var basicAuth = require('express-basic-auth');
var bcrypt = require('bcryptjs');
var fs = require('fs');
var passport = require('passport');
require('../config/passport')(passport); // pass passport for configuration

router.use(function (req, res, next) {
  res.locals.login = req.isAuthenticated();
  next();
});

var nconf = require('nconf');
// don't forget to change this
var conf_file = './config/config.json';
var conf_backup = './config/backup.json';
nconf.file({file: conf_file});
nconf.load();

router.use( bodyParser.json() );       // to support JSON-encoded bodies
router.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

//router.use(basicAuth({
//    users: { 'admin': 'supersecret' },
//    challenge: true,
//    unauthorizedResponse: getUnauthorizedResponse
//}));
 
//function getUnauthorizedResponse(req) {
//    return req.auth ?
//        ('Credentials ' + req.auth.user + ':' + req.auth.password + ' rejected') :
//        'No credentials provided';
//}

router.route('/login')
    .get(function(req, res, next) {
       res.render('login', { 
           title: 'PagerMon - Login',
           message: req.flash('loginMessage'),
           user: req.user
       }); 
    })
    // process the login form
    .post(passport.authenticate('local-login', {
        successRedirect : '/admin', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

router.post('/resetPass', isLoggedIn, function(req, res, next) {
    nconf.load();
    // find a user via passport
        var password = req.body.password;
        // bcrypt function
        if (password) {
            bcrypt.hash(password, 8, function(err, hash) {
                if (err) {
                    res.status(500);
                    res.json({'error': err});
                } else {
                    nconf.set('auth:encPass', hash);
                    nconf.save();
                    res.status(200).send({'status': 'ok'});
                }
            });
        } else {
            res.status(500);
            res.json({'error': 'Password empty'});
        }
        // save the password to config
    });

router.route('/settingsData')
    .get(isLoggedIn, function(req, res, next) {
        nconf.load();
        res.json(nconf.get());
    })
    .post(isLoggedIn, function(req, res, next) {
        nconf.load();
        if (req.body) {
            console.log(req.body);
            var currentConfig = nconf.get();
            fs.writeFileSync( conf_backup, JSON.stringify(currentConfig,null, 2) );
            fs.writeFileSync( conf_file, JSON.stringify(req.body,null, 2) );
            nconf.load();
            res.status(200).send({'status': 'ok'});
        } else {
            res.status(500).send({error: 'request body empty'});
        }

      // just an example of maybe updating the user
      //req.user.name = req.params.name;
      // save user ... etc
      //res.json(req.user);
    });

router.get('*', isLoggedIn, function(req, res, next) {
  res.render('admin', { title: 'PagerMon - Admin' });
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