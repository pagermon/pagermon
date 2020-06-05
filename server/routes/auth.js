const express = require('express');


const router = express.Router();
const bcrypt = require('bcryptjs');
const moment = require('moment');
const nconf = require('nconf');

const confFile = './config/config.json';
nconf.file({ file: confFile });
nconf.load();

// Brute force protection for public dupe checking routes
const ExpressBrute = require('express-brute');
const BruteKnex = require('brute-knex');

const db = require('../knex/knex.js');
const logger = require('../log');
const passport = require('../auth/local');
const authHelpers = require('../auth/_helpers');

const store = new BruteKnex({
        createTable: true,
        knex: db,
        tablename: 'protection',
});

const lockoutCallback = function(req, res, next, nextValidRequestDate) {
        res.status(429).send({ status: 'lockedout', error: 'Too many attempts, please try again later' });
        logger.auth.info(`Lockout: ${req.ip} Next Valid: ${nextValidRequestDate}`);
};

const bruteforcedupe = new ExpressBrute(store, {
        freeRetries: 10,
        minWait: 5000, // 5 seconds
        maxWait: 20000, // 20 seconds
        failCallback: lockoutCallback,
});

const bruteforcelogin = new ExpressBrute(store, {
        freeRetries: 5,
        minWait: 10000, // 10 seconds
        maxWait: 15 * 60 * 1000, // 15 minutes
        failCallback: lockoutCallback,
});

// End Bruteforce

router.route('/login')
        .get(function(req, res) {
                if (!req.isAuthenticated()) {
                        let user = '';
                        if (typeof req.username !== 'undefined') {
                                user = req.username;
                        }
                        res.render('auth', {
                                pageTitle: 'User',
                        });
                } else {
                        res.redirect('/');
                }
        })
        .post(bruteforcelogin.prevent, function(req, res, next) {
                passport.authenticate('login-user', (err, user) => {
                        if (err) {
                                //this is commented out as it seems to fire when a user is disabled?! even tho the below functions still run
                                //res.status(500).send({ status: 'failed', error: 'An Error Occured' });
                                logger.auth.error(err);
                        } else if (!user) {
                                res.status(401).send({ status: 'failed', error: 'Check Details and try again' });
                                logger.auth.debug(`Login Failed: ${req.body.username}`);
                        } else if (user) {
                                if (user.status !== 'disabled') {
                                        req.logIn(user, function(err) {
                                                if (err) {
                                                        res.status(401).send({
                                                                status: 'failed',
                                                                error: 'An error occured',
                                                        });
                                                        logger.auth.debug(
                                                                `Failed login ${JSON.stringify(user)} ${err}`
                                                        );
                                                } else {
                                                        // Update last logon timestamp for user
                                                        const { id } = user;
                                                        // create the datetime, thanks mysql ┌∩┐(◣_◢)┌∩┐
                                                        const currentTimestamp = moment().unix(); // in seconds
                                                        const currentDatetime = moment(currentTimestamp * 1000).format(
                                                                'YYYY-MM-DD HH:mm:ss'
                                                        );
                                                        return db
                                                                .from('users')
                                                                .where('id', '=', id)
                                                                .update({
                                                                        lastlogondate: currentDatetime,
                                                                })
                                                                .then(() => {
                                                                        // reset the bruteforce timer after successful login
                                                                        bruteforcelogin.reset(null);
                                                                        if (user.role !== 'admin') {
                                                                                res.status(200).send({
                                                                                        status: 'ok',
                                                                                        redirect: '/',
                                                                                });
                                                                        } else {
                                                                                res.status(200).send({
                                                                                        status: 'ok',
                                                                                        redirect: '/admin',
                                                                                });
                                                                        }
                                                                        logger.auth.debug(
                                                                                `Successful login ${JSON.stringify(
                                                                                        user
                                                                                )}`
                                                                        );
                                                                })
                                                                .catch(err => {
                                                                        logger.db.error(err);
                                                                });
                                                }
                                        });
                                } else {
                                        res.status(401).send({ status: 'failed', error: 'User Disabled' });
                                        logger.auth.debug(`User Disabled${req.user.username}`);
                                }
                        }
                })(req, res, next);
        });

router.route('/logout').get(isLoggedIn, function(req, res) {
        req.logout();
        res.redirect('/');
        logger.auth.debug(`Successful Logout ${req.user.username}`);
});

router.route('/profile/').get(isLoggedIn, function(req, res) {
        res.render('auth', {
                pageTitle: 'User',
        });
});

router.route('/profile/:id')
        .get(isLoggedIn, function(req, res, next) {
                const { username } = req.user;
                db.from('users')
                        .select('id', 'givenname', 'surname', 'username', 'email', 'lastlogondate')
                        .where('username', username)
                        .then(function(row) {
                                if (row.length > 0) {
                                        const rowsend = row[0];
                                        res.status(200);
                                        res.json(rowsend);
                                } else {
                                        res.status(500).json({ status: 'failed', error: '' });
                                        logger.auth.error('failed to select user');
                                }
                        })
                        .catch(err => {
                                logger.main.error(err);
                                return next(err);
                        });
        })
        .post(isLoggedIn, function(req, res) {
                if (req.body.username === req.user.username) {
                        const { username } = req.body;
                        const { givenname } = req.body;
                        const surname = req.body.surname || '';
                        const { email } = req.body;
                        const lastlogondate = Date.now();
                        console.time('insert');
                        db.from('users')
                                .returning('id')
                                .where('username', '=', req.user.username)
                                .update({
                                        username,
                                        givenname,
                                        surname,
                                        email,
                                        lastlogondate,
                                })
                                .then(result => {
                                        console.timeEnd('insert');
                                        res.status(200).send({ status: 'ok', id: result });
                                })
                                .catch(err => {
                                        console.timeEnd('insert');
                                        logger.main.error(err);
                                        res.status(500).send(err);
                                });
                } else {
                        res.status(401).json({ message: 'Please update your own details only' });
                        logger.auth.error('Possible attempt to compromise security POST:/auth/profile');
                }
        });

router.route('/register')
        .get(function(req, res) {
                const reg = nconf.get('auth:registration');
                if (reg) {
                        res.render('auth', {
                                title: 'Registration',
                                message: req.flash('registerMessage'),
                        });
                } else {
                        res.redirect('/');
                }
        })
        .post(function(req, res, next) {
                const reg = nconf.get('auth:registration');
                if (reg) {
                        const salt = bcrypt.genSaltSync();
                        const hash = bcrypt.hashSync(req.body.password, salt);
                        // dupecheck to prevent a non-literal insert being abused to reset passwords
                        return db('users')
                                .where('username', '=', req.body.username)
                                .orWhere('email', '=', req.body.email)
                                .select('id')
                                .then(row => {
                                        if (row.length > 0) {
                                                logger.auth.error(
                                                        `Duplicate registration via API${JSON.stringify(row)}`
                                                );
                                                res.status(401).json({ error: 'access denied' });
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
                                                                lastlogondate: Date.now(),
                                                        })
                                                        .then(() => {
                                                                passport.authenticate('login-user', (err, user) => {
                                                                        if (user) {
                                                                                req.logIn(user, function(err) {
                                                                                        if (err) {
                                                                                                res.status(500).json({
                                                                                                        status:
                                                                                                                'failed',
                                                                                                        error: err,
                                                                                                        redirect:
                                                                                                                '/auth/register',
                                                                                                });
                                                                                                logger.auth.error(err);
                                                                                        } else {
                                                                                                res.status(200).json({
                                                                                                        status: 'ok',
                                                                                                        redirect: '/',
                                                                                                });
                                                                                                logger.auth.info(
                                                                                                        `Created Account: ${user}`
                                                                                                );
                                                                                        }
                                                                                });
                                                                        } else {
                                                                                logger.auth.error(err);
                                                                                res.status(500).json({
                                                                                        status: 'failed',
                                                                                        error: err,
                                                                                        redirect: '/auth/register',
                                                                                });
                                                                        }
                                                                })(req, res, next);
                                                        })
                                                        .catch(err => {
                                                                logger.auth.error(err);
                                                                res.status(500).json({
                                                                        status: 'failed',
                                                                        error: 'registration disabled',
                                                                        redirect: '/auth/register',
                                                                });
                                                        });
                                        }
                                });
                }
                logger.auth.error('Registration attempted with registration disabled');
                res.status(400).json({ error: 'registration disabled' });
        });

router.route('/reset')
        .get(function(req, res) {
                let user = '';
                if (typeof req.username !== 'undefined') {
                        user = req.username;
                }
                if (req.user) {
                        return res.render('auth', {
                                title: 'User - Reset Password',
                                message: req.flash('loginMessage'),
                                username: user,
                        });
                } else {
                res.redirect('/auth/login');
                }
        })
        .post(isLoggedIn, function(req, res) {
                const { password } = req.body;
                // bcrypt function
                if (password && !authHelpers.comparePass(password, req.user.password)) {
                        const salt = bcrypt.genSaltSync();
                        const hash = bcrypt.hashSync(req.body.password, salt);
                        const { id } = req.user;
                        db.from('users')
                                .returning('id')
                                .where('id', '=', id)
                                .update({
                                        password: hash,
                                })
                                .then(() => {
                                        res.status(200).send({ status: 'ok', redirect: '/' });
                                        logger.auth.debug(`${req.username}Password Reset Successfully`);
                                })
                                .catch(err => {
                                        res.status(500).send({ status: 'failed', error: 'Failed to update password' });
                                        logger.auth.error(`${req.username}error resetting password${err}`);
                                });
                } else {
                        res.status(400).send({ status: 'failed', error: 'Password Blank or the Same' });
                }
        });

router.route('/userCheck/username/:id').get(bruteforcedupe.prevent, function(req, res, next) {
        const { id } = req.params;
        db.from('users')
                .select('username')
                .where('username', id)
                .then(row => {
                        if (row.length > 0) {
                                const rowsend = row[0];
                                res.status(200);
                                res.json(rowsend);
                        } else {
                                const rowsend = {
                                        username: '',
                                        password: '',
                                        givenname: '',
                                        surname: '',
                                        email: '',
                                        role: 'user',
                                        status: 'active',
                                };
                                res.status(200);
                                res.json(rowsend);
                        }
                })
                .catch(err => {
                        logger.main.error(err);
                        return next(err);
                });
});

router.route('/userCheck/email/:id').get(bruteforcedupe.prevent, function(req, res, next) {
        const { id } = req.params;
        db.from('users')
                .select('email')
                .where('email', id)
                .then(row => {
                        if (row.length > 0) {
                                const rowsend = row[0];
                                res.status(200);
                                res.json(rowsend);
                        } else {
                                const rowsend = {
                                        username: '',
                                        password: '',
                                        givenname: '',
                                        surname: '',
                                        email: '',
                                        role: 'user',
                                        status: 'active',
                                };
                                res.status(200);
                                res.json(rowsend);
                        }
                })
                .catch(err => {
                        logger.main.error(err);
                        return next(err);
                });
});

function isLoggedIn(req, res, next) {
        if (req.isAuthenticated()) {
                // if user is authenticated in the session, carry on
                return next();
        }
        // perform api authentication - all api keys are assumed to be admin
        // eslint-disable-next-line no-sequences
        passport.authenticate('login-api', { session: false, failWithError: true })(req, res, next),
                function(next) {
                        next();
                },
                // eslint-disable-next-line no-shadow
                function(res) {
                        return res.status(401).json({ error: 'Authentication failed.' });
                };
}

module.exports = router;

