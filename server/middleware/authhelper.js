// pass passport for configuration
const bcrypt = require('bcryptjs');
const nconf = require('../config');
const passport = require('../auth/local');

function isLoggedIn(req, res, next) {
        if (req.isAuthenticated())
                // if user is authenticated in the session, carry on
                return next();
        // perform api authentication - all api keys are assumed to be admin
        return (
                passport.authenticate('login-api', {
                        session: false,
                        failWithError: true,
                })(req, res, next),
                function(next) {
                        next();
                },
                function(innerRes) {
                        return innerRes.status(401).json({
                                error: 'Authentication failed.',
                        });
                }
        );
}

function isLoggedInMessages(req, res, next) {
        const apiSecurity = nconf.get('messages:apiSecurity');
        if (apiSecurity) {
                // check if Secure mode is on
                if (req.isAuthenticated())
                        // if user is authenticated in the session, carry on
                        return next();
                // perform api authentication - all api keys are assumed to be admin
                return (
                        passport.authenticate('login-api', {
                                session: false,
                                failWithError: true,
                        })(req, res, next),
                        function(next) {
                                next();
                        },
                        function(innerRes) {
                                return innerRes.status(401).json({
                                        error: 'Authentication failed.',
                                });
                        }
                );
        }
        return next();
}

function isAdminGUI(req, res, next) {
        if (req.isAuthenticated() && req.user.role === 'admin') {
                // if the user is authenticated and the user's role is admin carry on
                return next();
        }
        res.redirect('/');
}

function isAdmin(req, res, next) {
        if (req.isAuthenticated() && req.user.role === 'admin')
                // if the user is authenticated and the user's role is admin carry on
                return next();

        return (
                // if apikey in header perform api authentication - all api keys are assumed to be admin
                passport.authenticate('login-api', {
                        session: false,
                        failWithError: true,
                })(req, res, next),
                function(next) {
                        next();
                },
                function(innerRes) {
                        return innerRes.status(401).json({
                                error: 'Authentication failed.',
                        });
                }
        );
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
