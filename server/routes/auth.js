const express = require('express');
const router = express.Router();
var logger = require('../log');


const authHelpers = require('../auth/_helpers');
const passport = require('../auth/local');

router.post('/register', (req, res, next) => {
    return authHelpers.createUser(req, res)
        .then((response) => {
            passport.authenticate('login-user', (err, user, info) => {
                if (user) { 
                    req.logIn(user, function (err) {
                        if (err) {
                            req.flash('signupMessage', 'Failed to created account, please try again')
                            res.redirect('/auth/register');
                            logger.auth.error(err)
                        } else {
                            req.flash('signupMessage', 'Account created successfully');
                            res.redirect('/');
                            logger.auth.info('Created Account: ' + user)
                        }
                    })
                 } else {
                    logger.auth.error(err)
                    req.flash('signupMessage', 'Failed to create account, please try again.');
                    res.redirect('/auth/register');
                 }
            })(req, res, next);
        })
        .catch((err) => {
            logger.auth.error(err)
            req.flash('signupMessage', 'Failed to create account, please try again.');
            res.redirect('/auth/register');
        });
});

router.get('/login', (req, res, next) => {
    var user = '';
    if (typeof req.username != 'undefined') {
        user = req.username;
    }
   res.render('login', {
       title: 'PagerMon - Login',
       message: req.flash('loginMessage'),
       username: user
   });
});

router.post('/login', (req, res, next) => {
    passport.authenticate('login-user', (err, user, info) => {
        if (err) { 
            req.flash('loginMessage', 'An error has occured');
            res.redirect('login')
            logger.auth.error(err)
         }
        if (!user) { 
            req.flash('loginMessage', 'User not found');
            res.redirect('login')
            logger.auth.debug('User not found' + req.user.username)
        }
        if (user) {
            req.logIn(user, function (err) {
                if (err) { 
                    req.flash('loginMessage', 'Incorrect Password');
                    res.redirect('login')
                    logger.auth.debug('Failed login ' + user + ' ' + err)
                 } else {
                    res.redirect('/');
                    logger.auth.debug('Successful login ' + user)
                 }
            });
        }
    })(req, res, next);
});

router.get('/logout', (req, res, next) => {
    req.logout();
    res.redirect('/');
    logger.auth.debug('Successful Logout ' + req.user.username)
});


module.exports = router;