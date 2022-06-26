const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const LocalAPIKeyStrategy = require('passport-localapikey-update').Strategy;

// TODO: change to dependency injection
const config = require('../config');
const logger = require('../log'); // TODO: logger is never used. That sound like a bad idea.

const init = require('./passport');
const db = require('../knex/knex.js');

const authHelper = require('../middleware/authhelper');

const options = {};

init();

passport.use(
        'login-user',
        new LocalStrategy(options, (username, password, done) => {
                // check to see if the username exists
                db('users')
                        .where('username', '=', username)
                        .first()
                        .then(user => {
                                if (!user) {
                                        return done(null, false);
                                }
                                if (!authHelper.comparePass(password, user.password)) {
                                        return done(null, false);
                                }
                                return done(null, user);
                        })
                        .catch(err => done(err));
        })
);

passport.use(
        'login-api',
        new LocalAPIKeyStrategy(function(apikey, done) {
                config.load();
                const auth = config.get('auth');
                const key = auth.keys.find(x => x.key === apikey);
                // var key = auth.keys.find({ key: apikey });
                if (key) {
                        // do a bcrypt compare
                        if (apikey === key.key) {
                                return done(null, key.name);
                        }
                        return done(null, false);
                }
                return done(null, false);
        })
);

module.exports = passport;
