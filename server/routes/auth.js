const express = require('express');

const router = express.Router();
const bcrypt = require('bcrypt');
const moment = require('moment');
const nconf = require('nconf');

const confFile = './config/config.json';
nconf.file({ file: confFile });
nconf.load();

// Brute force protection for public dupe checking routes
const ExpressBrute = require('express-brute'); // TODO: Outdated, use express-rate-limit
const BruteKnex = require('brute-knex');

const db = require('../knex/knex.js');
const logger = require('../log');
const passport = require('../auth/local');
const authHelper = require('../middleware/authhelper');

const store = new BruteKnex({
        createTable: true,
        knex: db,
        tablename: 'protection',
});

const lockoutCallback = function (req, res, next, nextValidRequestDate) {
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
        .get(function getLogin(req, res) {
                if (req.isAuthenticated()) return res.redirect('/');
                res.render('auth', {
                        pageTitle: 'User',
                });
        })
        .post(bruteforcelogin.prevent, function postLogin(req, res, next) {
                passport.authenticate('login-user', (err, user) => {
                        if (!user) {
                                logger.auth.debug(`Login Failed: ${req.body.username}`);
                                return res.status(401).send({ status: 'failed', error: 'Check Details and try again' });
                        }
                        if (user.status === 'disabled') {
                                logger.auth.debug(`User Disabled${req.body.username}`);
                                return res.status(401).send({ status: 'failed', error: 'User Disabled' });
                        }
                        if (err) {
                                logger.auth.error(err);
                                return res.status(500).send({ status: 'failed', error: 'An Error Occured' });
                        }
                        req.logIn(user, async function (err) {
                                if (err) {
                                        logger.auth.debug(`Failed login ${JSON.stringify(user)} ${err}`);
                                        return res.status(401).send({
                                                status: 'failed',
                                                error: 'An error occured',
                                        });
                                }
                                // Update last logon timestamp for user
                                const { id } = user;
                                // create the datetime, thanks mysql ┌∩┐(◣_◢)┌∩┐
                                const currentTimestamp = moment().unix(); // in seconds
                                const currentDatetime = moment(currentTimestamp * 1000).format('YYYY-MM-DD HH:mm:ss');

                                try {
                                        await db.from('users').where('id', '=', id).update({
                                                lastlogondate: currentDatetime,
                                        });
                                } catch (error) {
                                        logger.db.error(error);
                                }

                                // reset the bruteforce timer after successful login
                                bruteforcelogin.reset(null);
                                if (user.role === 'admin')
                                        return res.status(200).send({
                                                status: 'ok',
                                                redirect: '/admin',
                                        });

                                logger.auth.debug(`Successful login ${JSON.stringify(user)}`);
                                return res.status(200).send({
                                        status: 'ok',
                                        redirect: '/',
                                });
                        });
                })(req, res, next);
        });

router.route('/logout').get(authHelper.isLoggedIn, function getLogout(req, res, next) {
        req.logout(function (err) {
                if (err) {
                        return next(err);
                }
        });
        res.redirect('/');
        logger.auth.debug(`Successful Logout ${req.user.username}`);
});

router.route('/profile').get(authHelper.isLoggedIn, function getProfile(req, res) {
        res.render('auth', {
                pageTitle: 'User',
        });
});

router.route('/profile/:id')
        .get(authHelper.isLoggedIn, async function getProfileId(req, res, next) {
                try {
                        const user = await db
                                .from('users')
                                .select('id', 'givenname', 'surname', 'username', 'email', 'lastlogondate')
                                .where('username', req.user.username)
                                .first();

                        if (!user) res.status(404).json({ status: 'failed', error: 'User not found' });

                        res.json(user);
                } catch {
                        res.status(500).json({ status: 'failed', error: '' });
                        logger.auth.error('failed to select user');
                }
        })
        .post(authHelper.isLoggedIn, async function postProfileId(req, res) {
                if (req.body.username !== req.user.username) {
                        logger.auth.error('Possible attempt to compromise security POST:/auth/profile');
                        logger.auth.error(`User ${req.user.username} attempted to update ${req.body.username}`);
                        return res.status(403).json({ message: 'Please update your own details only' });
                }

                const { username, givenname, email } = req.body;
                const surname = req.body.surname || '';
                const lastlogondate = Date.now();

                try {
                        const update = await db
                                .from('users')
                                .returning('id')
                                .where('username', '=', req.user.username)
                                .update({
                                        username,
                                        givenname,
                                        surname,
                                        email,
                                        lastlogondate,
                                });

                        return res.status(200).send({ status: 'ok', id: update[0].id });
                } catch (error) {
                        logger.main.error(error);
                        return res.status(400).send(error);
                }
        });

router.route('/register')
        .get(function getRegister(req, res) {
                if (!nconf.get('auth:registration')) return res.redirect('/');

                res.render('auth', {
                        title: 'Registration',
                        message: req.flash('registerMessage'),
                });
        })
        .post(async function postRegister(req, res, next) {
                if (!req.body.username || !req.body.email || !req.body.password)
                        return res
                                .status(400)
                                .json({ status: 'failed', error: 'Username, Email and Password are required' });

                const reg = nconf.get('auth:registration');
                if (!reg) {
                        logger.auth.error('Registration attempted with registration disabled');
                        return res.status(403).json({ status: 'failed', error: 'registration disabled' });
                }

                const salt = bcrypt.genSaltSync();
                const hash = bcrypt.hashSync(req.body.password, salt);

                try {
                        const dupecheck = await db('users')
                                .where('username', '=', req.body.username)
                                .orWhere('email', '=', req.body.email)
                                .select('id')
                                .first();

                        if (dupecheck) {
                                logger.auth.error(
                                        `Duplicate registration attempt via API - Conflict with user ${dupecheck.id}`
                                );
                                return res.status(401).json({ status: 'failed', error: 'access denied' });
                        }

                        await db('users').insert({
                                username: req.body.username,
                                password: hash,
                                givenname: req.body.givenname,
                                surname: req.body.surname,
                                email: req.body.email,
                                role: 'user',
                                status: 'active',
                                lastlogondate: Date.now(),
                        });

                        passport.authenticate('login-user', (err, user) => {
                                if (!user) {
                                        logger.auth.error(err);
                                        return res.status(500).json({
                                                status: 'failed',
                                                error: err,
                                                redirect: '/auth/register',
                                        });
                                }
                                req.logIn(user, function (err) {
                                        if (err) {
                                                logger.auth.error(err);
                                                return res.status(500).json({
                                                        status: 'failed',
                                                        error: err,
                                                        redirect: '/auth/register',
                                                });
                                        }
                                        logger.auth.info(`Created Account: ${user}`);
                                        return res.status(200).json({
                                                status: 'ok',
                                                redirect: '/',
                                        });
                                });
                        })(req, res, next);
                } catch (error) {
                        logger.auth.error(error);
                        // Todo: Wouldn't that more likely be a 500 error?
                        return res.status(400).json({
                                status: 'failed',
                                error: 'invalid data',
                        });
                }
        });

router.route('/reset')
        .get(function getResetPassword(req, res) {
                if (!req.user) return res.redirect('/auth/login');

                return res.render('auth', {
                        title: 'User - Reset Password',
                        message: req.flash('loginMessage'),
                        username: req.user.username,
                });
        })
        .post(authHelper.isLoggedIn, async function postResetPassword(req, res) {
                const { password } = req.body;

                if (password.length < 8)
                        return res
                                .status(400)
                                .send({ status: 'failed', error: 'New password has to have at least 8 characters' });

                // TODO: We should remove that! This can be used to brute force the password!
                if (authHelper.comparePass(password, req.user.password))
                        return res
                                .status(400)
                                .send({ status: 'failed', error: 'New password equals the old password' });

                const salt = bcrypt.genSaltSync();
                const hash = bcrypt.hashSync(req.body.password, salt);
                const { id: userId } = req.user;
                // need to update this query to select the user first then update.

                try {
                        await db.from('users').returning('id').where('id', '=', userId).update({
                                password: hash,
                        });

                        res.status(200).send({ status: 'ok', redirect: '/' });
                        logger.auth.debug(`${req.user.username} Password Reset Successfully`);
                } catch (error) {
                        logger.auth.error(`${req.user.username} error resetting password: ${error}`);
                        return res.status(500).send({ status: 'failed', error: 'Failed to update password' });
                }
        });

router.route('/userCheck/username/:username').get(
        bruteforcedupe.prevent,
        async function getUserCheckUsername(req, res, next) {
                const { username } = req.params;

                try {
                        const existingUser = await db.from('users').select('username').where({ username }).first();

                        const rowSend = existingUser || {
                                username: '',
                                password: '',
                                givenname: '',
                                surname: '',
                                email: '',
                                role: 'user',
                                status: 'active',
                        };

                        return res.json(rowSend);
                } catch (error) {
                        logger.main.error(error);
                        return next(error);
                }
        }
);

router.route('/userCheck/email/:email').get(bruteforcedupe.prevent, async function getUserCheckEmail(req, res, next) {
        const { email } = req.params;

        try {
                const existingUser = await db.from('users').select('email').where('email', email).first();

                const rowSend = existingUser || {
                        username: '',
                        password: '',
                        givenname: '',
                        surname: '',
                        email: '',
                        role: 'user',
                        status: 'active',
                };

                return res.json(rowSend);
        } catch (error) {
                logger.main.error(error);
                return next(error);
        }
});

module.exports = router;
