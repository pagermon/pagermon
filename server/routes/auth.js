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

// Brute force protection for public dupe checking routes
const ExpressBrute = require('express-brute');
const BruteKnex = require('brute-knex');
let store = new BruteKnex({
    createTable: true,
    knex: db,
    tablename: 'protection' 
});
const bruteforcedupe = new ExpressBrute(store, {
    freeRetries: 10,
    minWait: 5000, // 5 seconds
    maxWait: 20000 // 20 seconds
});

const bruteforcelogin= new ExpressBrute(store, {
    freeRetries: 5,
    minWait: 5*60*1000, // 5 minutes
    maxWait: 15*60*1000 // 15 minutes
});
//End Bruteforce

router.route('/login')
    .get(bruteforcelogin.prevent, function (req, res, next) {
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
                res.status(401).send({ 'status': 'failed', 'error': 'Login Failed - Check Details and try again' });
                logger.auth.debug('User not found' + req.user.username)
            }
            if (user) {
                if (user.status != 'disabled') {
                    req.logIn(user, function (err) {
                        if (err) {
                            res.status(401).send({ 'status': 'failed', 'error': 'Incorrect Password' });
                            logger.auth.debug('Failed login ' + JSON.stringify(user) + ' ' + err)
                        } else {
                            //Update last logon timestamp for user
                            var id = user.id
                            return db
                                .from('users')
                                .where('id', '=', id)
                                .update({
                                    lastlogondate: Date.now()
                                })
                                .then((result) => {
                                    //reset the bruteforce timer after successful login
                                    bruteforcelogin.reset(null)
                                    if (user.role !== 'admin') {
                                        res.status(200).send({ 'status': 'ok', 'redirect': '/' });
                                    } else {
                                        res.status(200).send({ 'status': 'ok', 'redirect': '/admin' });
                                    }
                                    logger.auth.debug('Successful login ' + JSON.stringify(user))
                                })
                                .catch((err) => {
                                    logger.db.error(err)
                                })
                        }
                    });
                } else {
                    res.status(401).send({ 'status': 'failed', 'error': 'User Disabled' });
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

router.route('/profile/')
    .get(isLoggedIn, function (req, res, next) {
        res.render('auth', {
            pageTitle: 'User',
        })
    });

router.route('/profile/:id')
    .get(isLoggedIn, function (req, res, next) {
            var username = req.user.username
            db.from('users')
                .select('id','givenname','surname','username','email','lastlogondate')
                .where('username', username)
                .then(function (row) {
                    if (row.length > 0) {
                        row = row[0]
                        res.status(200);
                        res.json(row);
                    } else {
                        res.status(500).json({ 'status': 'failed', 'error': error });
                        logger.auth.error('failed to select user')
                    }
                })
                .catch((err) => {
                    logger.main.error(err);
                    return next(err);
                })
    })
    .post(isLoggedIn, function (req, res, next) {
    if (req.body.username === req.user.username) {
        var username = req.body.username;
        var givenname = req.body.givenname;
        var surname = req.body.surname || '';
        var email = req.body.email;
        var lastlogondate = Date.now()
        console.time('insert');
        db.from('users')
          .returning('id')
          .where('username', '=', req.user.username)
          .update({
            username: username,
            givenname: givenname,
            surname: surname,
            email: email,
            lastlogondate: lastlogondate
          })
          .then((result) => {
            console.timeEnd('insert');
            res.status(200).send({ 'status': 'ok', 'id': result })
          })
          .catch((err) => {
            console.timeEnd('insert');
            logger.main.error(err)
            res.status(500).send(err);
          })
      } else {
        res.status(401).json({ message: 'Please update your own details only' });
        logger.auth.error('Possible attempt to compromise security POST:/auth/profile')
      }
    });

router.route('/register')
    .get(function (req, res, next) {
        var reg = nconf.get('auth:registration')
        if (reg) {
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
        if (reg) {
            const salt = bcrypt.genSaltSync();
            const hash = bcrypt.hashSync(req.body.password, salt);
            //dupecheck to prevent a non-literal insert being abused to reset passwords
            return db('users')
            .where('username' , '=' , req.body.username)
            .orWhere('email', '=', req.body.email)
            .select('id')
            .then((row) => {
                if (row.length > 0) {
                    logger.auth.error('Duplicate registration via API' + JSON.stringify(row))
                    res.status(401).json({ 'error': 'access denied' });
                } else {
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
                                        res.status(500).json({ 'status': 'failed', 'error': err, 'redirect': '/auth/register' });
                                        logger.auth.error(err)
                                    } else {
                                        res.status(200).json({ 'status': 'ok', 'redirect': '/' });
                                        logger.auth.info('Created Account: ' + user)
                                    }
                                })
                            } else {
                                logger.auth.error(err)
                                res.status(500).json({ 'status': 'failed', 'error': err, 'redirect': '/auth/register' });
                            }
                        })(req, res, next);
                    })
                    .catch((err) => {
                        logger.auth.error(err)
                        res.status(500).json({ 'status': 'failed', 'error': 'registration disabled', 'redirect': '/auth/register' });
                    });
                }
            })    
        } else {
            logger.auth.error('Registration attempted with registration disabled')
            res.status(400).json({ 'error': 'registration disabled' });
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
            res.status(400).send({ 'status': 'failed', 'error': 'Password Blank or the Same' });
        }
    });

router.route('/userCheck/username/:id')
    .get(bruteforcedupe.prevent, function (req, res, next) {
        var id = req.params.id;
        db.from('users')
            .select('username')
            .where('username', id)
            .then((row) => {
                if (row.length > 0) {
                    row = row[0]
                    res.status(200);
                    res.json(row);
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
                    res.json(row);
                }
            })
            .catch((err) => {
                logger.main.error(err);
                return next(err);
            })
    });

router.route('/userCheck/email/:id')
    .get(bruteforcedupe.prevent, function (req, res, next) {
        var id = req.params.id;
        db.from('users')
            .select('email')
            .where('email', id)
            .then((row) => {
                if (row.length > 0) {
                    row = row[0]
                    res.status(200);
                    res.json(row);
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
                    res.json(row);
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