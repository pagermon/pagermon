// pass passport for configuration
const bcrypt = require('bcrypt');
const nconf = require('nconf');

function isLoggedIn(req, res, next) {
        const passport = require('../auth/local');
        if (req.isAuthenticated()) {
                // if user is authenticated in the session, carry on
                return next();
        }

        // perform api authentication - all api keys are assumed to be admin
        return (
                passport.authenticate('login-api', { session: false, failWithError: true })(req, res, next),
                function (next) {
                        next();
                },
                function (res) {
                        return res.status(401).json({ error: 'Authentication failed.' });
                }
        );
}

function isLoggedInMessages(req, res, next) {
        const passport = require('../auth/local');
        const apiSecurity = nconf.get('messages:apiSecurity');
        if (!apiSecurity || req.isAuthenticated()) return next();

        // perform api authentication - all api keys are assumed to be admin
        return (
                passport.authenticate('login-api', { session: false, failWithError: true })(req, res, next),
                function (next) {
                        next();
                },
                function (res) {
                        return res.status(401).json({ error: 'Authentication failed.' });
                }
        );
}

function isAdminGUI(req, res, next) {
        if (!req.isAuthenticated() || req.user.role !== 'admin') return res.redirect('/');

        return next();
}

function isAdmin(req, res, next) {
        const passport = require('../auth/local');
        if (!req.isAuthenticated())
                return (
                        passport.authenticate('login-api', { session: false, failWithError: true })(req, res, next),
                        function (next) {
                                next();
                        },
                        function (res) {
                                return res.status(401).json({ error: 'Authentication failed.' });
                        }
                );
        if (req.user.role !== 'admin') {
                return res.status(403).json({ error: 'Authentication failed.' });
        }
        // if user is authenticated in the session, carry on
        return next();
}

function comparePass(userPassword, databasePassword) {
        return bcrypt.compareSync(userPassword, databasePassword);
}

module.exports = {
        isLoggedIn,
        isLoggedInMessages,
        isAdmin,
        isAdminGUI,
        comparePass,
};
