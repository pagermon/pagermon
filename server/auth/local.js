const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const LocalAPIKeyStrategy = require('passport-localapikey-update').Strategy;
var logger = require('../log');
var nconf = require('nconf');
var conf_file = './config/config.json';
nconf.file({file: conf_file});

const init = require('./passport');
var db = require('../knex/knex.js');
const authHelpers = require('./_helpers');

const options = {};

init();


passport.use('login-user', new LocalStrategy(options, (username, password, done) => {
    // check to see if the username exists
    db('users').where({ username }).first()
        .then((user) => {
            if (!user) return done(null, false);
            if (!authHelpers.comparePass(password, user.password)) {
                return done(null, false);
            } else {
                return done(null, user);
            }
        })
        .catch((err) => { return done(err); });
}));

passport.use('login-api', new LocalAPIKeyStrategy(
    function (apikey, done) {
        nconf.load();
        var auth = nconf.get('auth');
        var key = auth.keys.find(x => x.key === apikey);
        //var key = auth.keys.find({ key: apikey });
        if (key) {
            // do a bcrypt compare
            if (apikey == key.key) {
                return done(null, key.name);
            } else {
                return done(null, false);
            }
        } else {
            return done(null, false);
        }
    }
));

module.exports = passport;