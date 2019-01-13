// config/passport.js

// load all the things we need
var LocalStrategy = require('passport-local').Strategy
var LocalAPIKeyStrategy = require('passport-localapikey-update').Strategy

var bcrypt = require('bcryptjs')
var nconf = require('nconf')
// don't forget to change this
var conf_file = './config/config.json'
nconf.file({ file: conf_file })

var getAuth = function () {
  nconf.load()
  var auth = nconf.get('auth')
  return auth
}

// checking if password is valid
var validPassword = function (password) {
  var auth = getAuth()
  return bcrypt.compareSync(password, auth.encPass)
}

// expose this function to our app using module.exports
module.exports = function (passport) {
  // used to serialize the user for the session
  passport.serializeUser(function (user, done) {
    var auth = getAuth()
    done(null, auth.user)
  })

  // used to deserialize the user
  passport.deserializeUser(function (id, done) {
    var auth = getAuth()
    done(null, auth.user)
  })

  passport.use('localapikey', new LocalAPIKeyStrategy(
    function (apikey, done) {
      var auth = getAuth()
      var key = auth.keys.find(x => x.key === apikey)
      // var key = auth.keys.find({ key: apikey });
      if (key) {
        // do a bcrypt compare
        if (apikey === key.key) {
          return done(null, key.name)
        } else {
          return done(null, false)
        }
      } else {
        return done(null, false)
      }
    }
  ))

  passport.use('local-login', new LocalStrategy({
    usernameField: 'user',
    passwordField: 'password',
    passReqToCallback: true
  },
  function (req, user, password, done) {
    var auth = getAuth()
    if (user === auth.user) {
      if (validPassword(password)) {
        return done(null, auth.user)
      } else {
        return done(null, false, req.flash('loginMessage', 'Authentication failed.'))
      }
    } else {
      return done(null, false, req.flash('loginMessage', 'Authentication failed.'))
    }
  }))
}
