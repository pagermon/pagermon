const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const LocalAPIKeyStrategy = require('passport-localapikey-update').Strategy;

const nconf = require('nconf');

const confFile = './config/config.json';
nconf.file({ file: confFile });

const init = require('./passport');
const db = require('../knex/knex.js');

const authHelper = require('../middleware/authhelper');

const options = {};

init();

passport.use(
        'login-user',
        new LocalStrategy(options, async (username, password, done) => {
                if (!username || !password) done(new Error('Username and password required'));

                try {
                        const user = await db('users').where('username', '=', username).first();

                        if (!user) return done(null, false);
                        if (!authHelper.comparePass(password, user.password)) return done(null, false);

                        delete user.password; // Don't put the password in the session

                        return done(null, user);
                } catch (error) {
                        done(error);
                }
        })
);

passport.use(
        'login-api',
        new LocalAPIKeyStrategy(function (apikey, done) {
                nconf.load();
                const auth = nconf.get('auth');
                const key = auth.keys.find((x) => x.key === apikey);
                // var key = auth.keys.find({ key: apikey });
                if (!key) return done(null, false);
                return done(null, key.name);
        })
);

module.exports = passport;
