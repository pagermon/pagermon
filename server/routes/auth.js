const express = require('express');
const router = express.Router();
var logger = require('../log');
var db = require('../knex/knex.js');
const bcrypt = require('bcryptjs');
const authHelpers = require('../auth/_helpers');
const passport = require('../auth/local');
var nconf = require('nconf');
var conf_file = './config/config.json';
nconf.file({ file: conf_file });
nconf.load();



router.route('/login')
    .get(function (req, res, next) {
        var user = '';
        if (typeof req.username != 'undefined') {
            user = req.username;
        }
        res.render('auth', {
            pageTitle: 'User'
        });
    })
    .post(function (req, res, next) {
        passport.authenticate('login-user', (err, user, info) => {
            if (err) {
                req.flash('loginMessage', 'An error has occured');
                res.status(500).send({ 'status': 'failed', 'error': 'Error Occured' });
                logger.auth.error(err)
            }
            if (!user) {
                req.flash('loginMessage', 'User not found');
                res.status(500).send({ 'status': 'failed', 'error': 'Login Failed - Check Details and try again' });
                logger.auth.debug('User not found' + req.user.username)
            }
            if (user) {
                console.log(user)
                if (user.status != 'disabled') {
                    req.logIn(user, function (err) {
                        if (err) {
                            res.status(500).send({ 'status': 'failed', 'error': 'Incorrect Password' });
                            logger.auth.debug('Failed login ' + JSON.stringify(user) + ' ' + err)
                        } else {
                            if (user.role !== 'admin') {
                                res.status(200).send({ 'status': 'ok', 'redirect': '/' });
                            } else {
                                res.status(200).send({ 'status': 'ok', 'redirect': '/admin' });
                            }
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
                    res.status(500).send({ 'status': 'failed', 'error': 'User Disabled' });
                    logger.auth.debug('User Disabled' + req.user.username)
                }
            }
        })(req, res, next);
    });

router.route('/logout')
    .get(isLoggedIn, function (req, res, next) {
        req.logout();
        res.redirect('/');
        logger.auth.debug('Successful Logout ' + req.user.username)
    });

router.route('/profile')
    .get(isLoggedIn, function (req, res, next) {
        res.render('auth', {
            pageTitle: 'User',
            user: req.user
        })
    });

router.route('/register')
    .get(function (req, res, next) {
        var reg = nconf.get('auth:registration')
        if (reg === 'enabled') {
            return res.render('auth', {
                title: 'Registration',
                message: req.flash('registerMessage'),
            });
        } else {
            res.redirect('/');
        }
    })
    .post(function (req, res, next) {
        var reg = nconf.get('auth:registration')
        if (reg === 'enabled') {
            const salt = bcrypt.genSaltSync();
            const hash = bcrypt.hashSync(req.body.password, salt);

            return db('users')
                .insert({
                    username: req.body.username,
                    password: hash,
                    givenname: req.body.givenname,
                    surname: req.body.surname,
                    email: req.body.email,
                    role: 'user',
                    status: 'active',
                    lastlogondate: Date.now()
                })
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
        } else {
            logger.auth.error('Registration attempted with registration disabled')
            res.status(500).json({ 'error': 'registration disabled' });
        }
    });

router.route('/reset')
    .get(function (req, res, next) {
        var user = '';
        if (typeof req.username != 'undefined') {
            user = req.username;
        }
        if (req.user) {
            return res.render('auth', {
                title: 'User - Reset Password',
                message: req.flash('loginMessage'),
                username: user
            });
        } else {
            res.redirect('/auth/login')
        }
    })
    .post(isLoggedIn, function (req, res, next) {
        var password = req.body.password;
        // bcrypt function
        if (password && (!authHelpers.comparePass(password, req.user.password))) {
            const salt = bcrypt.genSaltSync();
            const hash = bcrypt.hashSync(req.body.password, salt);
            console.log(req.user.password)
            console.log(hash)
            id = req.user.id
            db.from('users')
                .returning('id')
                .where('id', '=', id)
                .update({
                    password: hash
                })
                .then((result) => {
                    res.status(200).send({ 'status': 'ok', 'redirect': '/' });
                    logger.auth.debug(req.username + 'Password Reset Successfully')
                })
                .catch((err) => {
                    res.status(500).send({ 'status': 'failed', 'error': 'Failed to update password' });
                    logger.auth.error(req.username + 'error resetting password' + err)
                })
        } else {
            res.status(500).send({ 'status': 'failed', 'error': 'Password Blank or the Same' });
        }
    });

router.route('/userCheck/username/:id')
    .get(function (req, res, next) {
        var id = req.params.id;
        db.from('users')
            .select('*')
            .where('username', id)
            .then((row) => {
                if (row.length > 0) {
                    row = row[0]
                    res.status(200);
                    res.send(row.username);
                } else {
                    row = {
                        "username": "",
                        "password": "",
                        "givenname": "",
                        "surname": "",
                        "email": "",
                        "role": "user",
                        "status": "active"
                    };
                    res.status(200);
                    res.send(row.username);
                }
            })
            .catch((err) => {
                logger.main.error(err);
                return next(err);
            })
    });

router.route('/userCheck/email/:id')
    .get(function (req, res, next) {
        var id = req.params.id;
        db.from('users')
            .select('*')
            .where('email', id)
            .then((row) => {
                if (row.length > 0) {
                    row = row[0]
                    res.status(200);
                    res.send(row.email);
                } else {
                    row = {
                        "username": "",
                        "password": "",
                        "givenname": "",
                        "surname": "",
                        "email": "",
                        "role": "user",
                        "status": "active"
                    };
                    res.status(200);
                    res.send(row.email);
                }
            })
            .catch((err) => {
                logger.main.error(err);
                return next(err);
            })
    });


function isLoggedIn(req, res, next) {
    if (req.isAuthenticated()) {
        // if user is authenticated in the session, carry on
        return next();
    } else {
        //perform api authentication - all api keys are assumed to be admin 
        passport.authenticate('login-api', { session: false, failWithError: true })(req, res, next),
            function (next) {
                next();
            },
            function (res) {
                return res.status(401).json({ error: 'Authentication failed.' });
            }
    }
}
//route middleware to make sure the user is an admin where required
function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.role == 'admin') {
        //if the user is authenticated and the user's role is admin carry on
        return next();
    } else {
        //perform api authentication - all api keys are assumed to be admin 
        passport.authenticate('login-api', { session: false, failWithError: true })(req, res, next),
            function (next) {
                next();
            },
            function (res) {
                return res.status(401).json({ error: 'Authentication failed.' });
            }
    }
}


module.exports = router;