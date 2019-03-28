const passport = require('passport');
var LocalStrategy   = require('passport-local').Strategy;
var bcrypt = require('bcryptjs');
var nconf = require('nconf');
var conf_file = './config/config.json';
nconf.file({file: conf_file});
var db = require('../knex/knex.js');

const authHelpers = require('./_helpers');
const init = require("./passport");
const options = {};

init();

passport.use(new LocalStrategy(options, function(username, password, done) {
	db('users').where({ username }).first()
	  .then((user) => {
	    if (!user) return done(null, false);
	    if (!authHelpers.comparePass(password, user.password)) {
	      return done(null, false) ;
	    } else {
	      return done(null, user);
	    }
	  })
}));

module.exports = passport;
