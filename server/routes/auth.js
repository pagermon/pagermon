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
      if (user) { res.redirect('/'); }
    })(req, res, next);
  })
  .catch((err) => { res.redirect('/auth/register'); });
});

router.get('/register', (req, res, next) => {
        var username = 'test';
        if (typeof req.username != 'undefined') {
            user = req.username;
        }
       res.render('auth/register', {
           title: 'PagerMon - Sign Up',
           message: req.flash('signupMessage'),
           username: username
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
    if (err) { res.redirect('/'); }
    if (!user) { res.redirect('/'); }
    if (user) {
      req.logIn(user, function (err) {
        if (err) { res.redirect('/'); }
        res.redirect('/myaccount');
      });
    }
  })(req, res, next);
});

router.get('/logout', (req, res, next) => {
  req.logout();
  res.redirect('/');
});

module.exports = router;
