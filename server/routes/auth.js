const express = require('express');
const router = express.Router();
var logger = require('../log');
var db = require('../knex/knex.js');
const bcrypt = require('bcryptjs');

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
            console.log(user)
            if (user.status != 'disabled') {
                req.logIn(user, function (err) {
                    if (err) {
                        req.flash('loginMessage', 'Incorrect Password');
                        res.redirect('login')
                        logger.auth.debug('Failed login ' + JSON.stringify(user) + ' ' + err)
                    } else {
                        res.redirect('/');
                        logger.auth.debug('Successful login ' + JSON.stringify(user))
                        //Update last logon timestamp for user
                        var id = user.id
                        db
                            .from('users')
                            .where('id', '=', id)
                            .update({
                                lastlogondate: Date.now()
                            })
                            .then((result) => {
                            })
                            .catch((err) => {
                                logger.db.error(err)
                            })
                    }
                });
            } else {
                req.flash('loginMessage', 'User is disabled');
                res.redirect('login')
                logger.auth.debug('User not found' + req.user.username)
            }
        }
    })(req, res, next);
});

router.get('/reset', (req, res, next) => {
    var user = '';
    if (typeof req.username != 'undefined') {
        user = req.username;   
    } 
    if (req.user) {
        return res.render('reset', {
            title: 'PagerMon - Reset Password',
            message: req.flash('loginMessage'),
            username: user
        });
    } else {
        res.redirect('/auth/login')
    }
});

router.post('/reset', function(req, res, next) {
    // find a user via passport
        var password = req.body.password;
        // bcrypt function
        if (password) {
            const salt = bcrypt.genSaltSync();
            const hash = bcrypt.hashSync(req.body.password, salt);
            id = req.user.id
            db.from('users')
            .returning('id')
            .where('id', '=', id)
            .update({
                password: hash
            })
            .then((result) => {
                res.redirect('/').send({'status': 'ok'});
                logger.auth.debug(req.username + 'Password Reset Successfully')
            })
            .catch((err) => {
                res.status(500);
                res.json({'error': err});
                logger.auth.error(err)
            })
        } else {
            res.status(500);
            res.json({'error': 'Password empty'});
        }
    });

router.get('/logout', (req, res, next) => {
    req.logout();
    res.redirect('/');
    logger.auth.debug('Successful Logout ' + req.user.username)
});


module.exports = router;