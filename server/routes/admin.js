var express = require('express');
var bodyParser = require('body-parser');
var router = express.Router();
var bcrypt = require('bcryptjs');
var fs = require('fs');
var logger = require('../log');
var util = require('util');
var passport = require('passport');
require('../config/passport')(passport); // pass passport for configuration

router.use(function (req, res, next) {
  res.locals.login = req.isAuthenticated();
  next();
});

var nconf = require('nconf');
var conf_file = './config/config.json';
var conf_backup = './config/backup.json';
nconf.file({file: conf_file});
nconf.load();

router.use(bodyParser.json());       // to support JSON-encoded bodies
router.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

router.post('/resetPass', isLoggedIn, function(req, res, next) {
	// TODO: Impliment Cange Password based on new auth framework
});

router.route('/settingsData')
    .get(isLoggedIn, function(req, res, next) {
        nconf.load();
        let settings = nconf.get();
        // logger.main.debug(util.format('Config:\n\n%o',settings));
        let plugins = [];
        fs.readdirSync('./plugins').forEach(file => {
            if (file.endsWith('.json')) {
                let pConf = require(`../plugins/${file}`);
                if (!pConf.disable)
                    plugins.push(pConf);
            }
        });
        // logger.main.debug(util.format('Plugin Config:\n\n%o',plugins));
        let data = {"settings": settings, "plugins": plugins}
        res.json(data);
    })
    .post(isLoggedIn, function(req, res, next) {
        nconf.load();
        if (req.body) {
            //console.log(req.body);
            var currentConfig = nconf.get();
            fs.writeFileSync( conf_backup, JSON.stringify(currentConfig,null, 2) );
            fs.writeFileSync( conf_file, JSON.stringify(req.body,null, 2) );
            nconf.load();
            res.status(200).send({'status': 'ok'});
        } else {
            res.status(500).send({error: 'request body empty'});
        }
    });

router.get('*', isLoggedIn, function(req, res, next) {
  res.render('admin', { title: 'PagerMon - Admin' });
});

module.exports = router;

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated())
        return next();

    // if they aren't redirect them to the home page
    req.flash('loginMessage', 'You need to be logged in to access this page');
    res.redirect('/auth/login');
}
