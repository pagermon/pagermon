const passport = require('passport');
var db = require('../knex/knex.js');

module.exports = () => {
        passport.serializeUser((user, done) => {
                done(null, user.id);
        });

        passport.deserializeUser((id, done) => {
                db('users')
                        .where({ id })
                        .first()
                        .then(user => {
                                // check if user returned, if not invalidate existing cookies
                                if (user) {
                                        done(null, user);
                                } else {
                                        // this invalidates existing sessions if no user returned.
                                        done(null, false);
                                }
                        })
                        .catch(err => {
                                done(err, null);
                        });
        });
};
