var passport = require('passport');
var passport = require('../auth/local'); // pass passport for configuration
const authHelpers = require('../auth/_helpers');

var nconf = require('nconf');

var confFile = './config/config.json';
nconf.file({ file: confFile });
nconf.load();

exports.isLoggedIn = function (req, res, next) {    
    var apiSecurity = nconf.get('messages:apiSecurity');
        if (apiSecurity) { //check if Secure mode is on
            if (req.isAuthenticated()) {
                // if user is authenticated in the session, carry on
                return next();
            } else {
                //perform api authentication - all api keys are assumed to be admin 
                passport.authenticate('login-api', { session: false, failWithError: true })(req, res, next),
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
  //route middleware to make sure the user is an admin where required
