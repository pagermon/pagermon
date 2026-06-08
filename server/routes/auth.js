const express = require('express');

const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const moment = require('moment');
const nconf = require('nconf');
const nodemailer = require('nodemailer');

const confFile = './config/config.json';
nconf.file({ file: confFile });
nconf.load();

// Brute force protection for public dupe checking routes
const ExpressBrute = require('express-brute');
const BruteKnex = require('brute-knex');

const db = require('../knex/knex.js');
const logger = require('../log');
const passport = require('../auth/local');
const authHelper = require('../middleware/authhelper')

const store = new BruteKnex({
        createTable: true,
        knex: db,
        tablename: 'protection',
});

const lockoutCallback = function(req, res, next, nextValidRequestDate) {
        res.status(429).send({ status: 'lockedout', error: 'Too many attempts, please try again later' });
        logger.auth.info(`Lockout: ${req.ip} Next Valid: ${nextValidRequestDate}`);
};

const generateTempPassword = () =>
        crypto
                .randomBytes(9)
                .toString('base64')
                .replace(/[+/=]/g, '')
                .slice(0, 12);

const loadSmtpConfig = () => {
        const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, SMTP_FROM, SMTP_FROM_NAME } = process.env;

        if (!SMTP_HOST || !SMTP_PORT || !SMTP_FROM) {
                return null;
        }

        const baseConfig = {
                host: SMTP_HOST,
                port: Number(SMTP_PORT),
                secure: String(SMTP_SECURE).toLowerCase() === 'true',
                tls: {
                        rejectUnauthorized: false,
                },
        };

        if (SMTP_USER && SMTP_PASS) {
                baseConfig.auth = {
                        user: SMTP_USER,
                        pass: SMTP_PASS,
                };
        }

        return {
                transport: baseConfig,
                from: SMTP_FROM_NAME ? `${SMTP_FROM_NAME} <${SMTP_FROM}>` : SMTP_FROM,
        };
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

router.route('/forgot')
        .get(function(req, res) {
                if (!req.isAuthenticated()) {
                        res.render('auth', {
                                pageTitle: 'User',
                        });
                } else {
                        res.redirect('/');
                }
        })
        .post(bruteforcelogin.prevent, async function(req, res) {
                const { email } = req.body;

                if (!email) {
                        return res.status(400).send({ status: 'failed', error: 'Email is required' });
                }

                const smtpConfig = loadSmtpConfig();

                if (!smtpConfig) {
                        return res.status(500).send({
                                status: 'failed',
                                error: 'SMTP is not configured. Please set SMTP_HOST, SMTP_PORT and SMTP_FROM environment variables.',
                        });
                }

                try {
                        const user = await db('users')
                                .whereRaw('LOWER(email) = LOWER(?)', [email])
                                .first();

                        if (user) {
                                const tempPassword = generateTempPassword();
                                const salt = bcrypt.genSaltSync();
                                const hash = bcrypt.hashSync(tempPassword, salt);

                                await db('users')
                                        .where({ id: user.id })
                                        .update({ password: hash });

                                const transporter = nodemailer.createTransport(smtpConfig.transport, []);

                                await transporter.sendMail({
                                        from: smtpConfig.from,
                                        to: user.email,
                                        subject: 'Your PagerMon temporary password',
                                        text: `Hi ${user.username},\n\nYour password has been reset. Use the temporary password below to sign in and update your credentials.\n\nTemporary password: ${tempPassword}\n\nFor security, please log in and change this password immediately.`,
                                });
                                logger.auth.info(`Temporary password emailed for ${user.username}`);
                        }

                        res.status(200).send({ status: 'ok' });
                } catch (err) {
                        logger.auth.error(err);
                        res.status(500).send({ status: 'failed', error: 'Unable to process request' });
                }
        });

router.route('/logout').get(authHelper.isLoggedIn, function(req, res) {
        req.logout();
        res.redirect('/');
        logger.auth.debug(`Successful Logout ${req.user.username}`);
});

router.route('/profile/').get(authHelper.isLoggedIn, function(req, res) {
        res.render('auth', {
                pageTitle: 'User',
        });
});

router.route('/profile/:id')
        .get(authHelper.isLoggedIn, function(req, res, next) {
                const { username } = req.user;
                const { id } = req.user;
                const userSelect = db.from('users')
                        .select('id', 'givenname', 'surname', 'username', 'email', 'mobile', 'pushover', 'browser_toast', 'browser_sound', 'lastlogondate')
                        .where('username', username);

                const aliasSelect = db.from('user_aliases')
                        .pluck('alias_id')
                        .where('user_id', id);

                Promise.all([userSelect, aliasSelect])
                        .then(function(results) {
                                const row = results[0];
                                const aliases = results[1];
                                if (row.length > 0) {
                                        const rowsend = row[0];
                                        rowsend.alertAliases = aliases || [];
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
        .post(authHelper.isLoggedIn, function(req, res) {
                if (req.body.username === req.user.username) {
                        const { username } = req.body;
                        const { givenname } = req.body;
                        const surname = req.body.surname || '';
                        const { email } = req.body;
                        const mobile = req.body.mobile || null;
                        const pushover = req.body.pushover || null;
                        const browser_toast = req.body.browser_toast === true || req.body.browser_toast === 'true' || req.body.browser_toast === 1 || req.body.browser_toast === '1';
                        const browser_sound = req.body.browser_sound === true || req.body.browser_sound === 'true' || req.body.browser_sound === 1 || req.body.browser_sound === '1';
                        const alertAliases = Array.isArray(req.body.alertAliases)
                                ? Array.from(new Set(req.body.alertAliases
                                        .map(item => parseInt(item, 10))
                                        .filter(item => !isNaN(item))))
                                : [];
                        const lastlogondate = Date.now();
                        console.time('insert');
                        db('capcodes')
                                .pluck('id')
                                .whereIn('id', alertAliases)
                                .then((validAliasIds) => {
                                        return db.transaction(function(trx) {
                                                return trx.from('users')
                                                        .returning('id')
                                                        .where('username', '=', req.user.username)
                                                        .update({
                                                                username,
                                                                givenname,
                                                                surname,
                                                                email,
                                                                mobile,
                                                                pushover,
                                                                browser_toast,
                                                                browser_sound,
                                                                lastlogondate,
                                                        })
                                                        .then(() => {
                                                                return trx('user_aliases')
                                                                        .where('user_id', req.user.id)
                                                                        .del()
                                                                        .then(() => {
                                                                                if (validAliasIds.length === 0) {
                                                                                        return null;
                                                                                }
                                                                                const insertRows = validAliasIds.map(aliasId => ({
                                                                                        user_id: req.user.id,
                                                                                        alias_id: aliasId,
                                                                                }));
                                                                                return trx('user_aliases').insert(insertRows);
                                                                        });
                                                        });
                                        });
                                })
                                .then(result => {
                                        console.timeEnd('insert');
                                        res.status(200).send({ status: 'ok', id: result });
                                })
                                .catch(err => {
                                        console.timeEnd('insert');
                                        logger.main.error(err);
                                        res.status(400).send(err);
                                });
                } else {
                        res.status(401).json({ message: 'Please update your own details only' });
                        logger.auth.error('Possible attempt to compromise security POST:/auth/profile');
                }
        });

router.route('/aliases')
        .get(authHelper.isLoggedIn, function(req, res, next) {
                db.from('capcodes')
                        .select('id', 'alias', 'agency', 'address')
                        .where('user_subscribable', 1)
                        .orderBy('alias', 'asc')
                        .then(function(rows) {
                                res.status(200).json(rows);
                        })
                        .catch(err => {
                                logger.main.error(err);
                                return next(err);
                        });
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
                                                                res.status(400).json({
                                                                        status: 'failed',
                                                                        error: 'invalid data',
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
        .post(authHelper.isLoggedIn, function(req, res) {
                const { password } = req.body;
                // bcrypt function
                if (password.length && !authHelper.comparePass(password, req.user.password)) {
                        const salt = bcrypt.genSaltSync();
                        const hash = bcrypt.hashSync(req.body.password, salt);
                        const { id } = req.user;
                        //need to update this query to select the user first then update. 
                        db.from('users')
                                .returning('id')
                                .where('id', '=', id)
                                .update({
                                        password: hash,
                                })
                                .then(() => {
                                        res.status(200).send({ status: 'ok', redirect: '/' });
                                        logger.auth.debug(`${req.user.username} Password Reset Successfully`);
                                })
                                .catch(err => {
                                        res.status(500).send({ status: 'failed', error: 'Failed to update password' });
                                        logger.auth.error(`${req.user.username} error resetting password${err}`);
                                        console.log(err)
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

module.exports = router;

