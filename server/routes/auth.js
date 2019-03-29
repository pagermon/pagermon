var conf_file = './config/config.json';
var express = require('express');
var router = express.Router();
var nconf = require('nconf');
nconf.file({file: conf_file});
nconf.load();

const authHelpers = require('../auth/_helpers');
const passport = require('../auth/local');

router.post('/register', (req, res, next)  => {
  return authHelpers.createUser(req, res)
  .then((response) => {
    passport.authenticate('local', (err, user, info) => {
      if (user) {
	      req.logIn(user, function (err) {
		      if(err){
			      req.flash('signupMessage', 'Failed to create account, please try again.');
			      res.redirect('/auth/register');
		      }
		      req.flash('signupMessage', 'Account created successfully, Welcome.');
		      res.redirect('/');
	      });
      }else{
	      req.flash('signupMessage', 'Failed to create account, please try again.');
	      res.redirect('/auth/register');
      }
    })(req, res, next);
  })
  .catch((err) => { req.flash('signupMessage', 'Failed to create account, please try again.'); res.redirect('/auth/register'); });
});

router.get('/register', (req, res, next) => {
       res.render('auth/register', {
           title: 'PagerMon - Sign Up',
           message: req.flash('signupMessage')
       });

});

router.get('/login', (req, res, next) => {
    var user = '';
    if (typeof req.username != 'undefined') {
        user = req.username;
    }
   res.render('auth/login', {
       title: 'PagerMon - Login',
       message: req.flash('loginMessage'),
       username: user
   });
});

router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) { req.flash('loginMessage', '1. An error has occured, please try again.'); res.redirect('/auth/login'); }
    if (!user) { req.flash('loginMessage', '2. Failed to authenticate supplied credentials'); res.redirect('/auth/login'); }
    if (user) {
      console.log('====================');
      console.log(user);
      console.log('====================');
      req.logIn(user, function (err) {
        if (err) { req.flash('loginMessage', '3. Failed to authenticate supplied credentials'); res.redirect('/auth/login'); }
        res.redirect('/');
      });
    }
  })(req, res, next);
});

router.get('/logout', (req, res, next) => {
  req.logout();
  res.redirect('/');
});

module.exports = router;
