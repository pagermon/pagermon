// pass passport for configuration
const bcrypt = require('bcryptjs');
var nconf = require('nconf');

var confFile = './config/config.json';
nconf.file({ file: confFile });
nconf.load();

function isLoggedIn (req, res, next) {    
    const passport = require('../auth/local');
            if (req.isAuthenticated()) {
                // if user is authenticated in the session, carry on
                return next();
            } else {
                //perform api authentication - all api keys are assumed to be admin 
                return passport.authenticate('login-api', { session: false, failWithError: true })(req, res, next),
                    function (next) {
                        next();
                    },
                    function (res) {
                        return res.status(401).json({ error: 'Authentication failed.' });
                    }
            }
}

function isLoggedInMessages (req, res, next) {    
    const passport = require('../auth/local');
    var apiSecurity = nconf.get('messages:apiSecurity');
        if (apiSecurity) { //check if Secure mode is on
            if (req.isAuthenticated()) {
                // if user is authenticated in the session, carry on
                return next();
            } else {
                //perform api authentication - all api keys are assumed to be admin 
                return passport.authenticate('login-api', { session: false, failWithError: true })(req, res, next),
                    function (next) {
                        next();
                    },
                    function (res) {
                        return res.status(401).json({ error: 'Authentication failed.' });
                    }
            }
        } else {
            return next();
        }
}

function isAdminGUI (req, res, next) {
    if (req.isAuthenticated() && req.user.role == 'admin') {
      //if the user is authenticated and the user's role is admin carry on
      return next();
    } else {
        res.redirect('/')
    }
}

function isAdmin (req, res, next) {
    const passport = require('../auth/local');
    if (req.isAuthenticated() && req.user.role == 'admin') {
      //if the user is authenticated and the user's role is admin carry on
      return next();
    } else {
        //if apikey in header perform api authentication - all api keys are assumed to be admin 
      return passport.authenticate('login-api', { session: false, failWithError: true })(req, res, next),
        function (next) {
          next();
        },
        function (res) {
          return res.status(401).json({ error: 'Authentication failed.' });
        }
    } 
  }

  function comparePass(userPassword, databasePassword) {
    return bcrypt.compareSync(userPassword, databasePassword);
}

module.exports = {
    isLoggedIn,
    isLoggedInMessages,
    isAdmin,
    isAdminGUI,
    comparePass
}
  
