var express = require('express');
var bodyParser = require('body-parser');
var router = express.Router();
var bcrypt = require('bcryptjs');
var fs = require('fs');
var logger = require('../log');
var util = require('util');
var passport = require('../auth/local'); // pass passport for configuration
const authHelper = require('../middleware/authhelper')

router.use(function (req, res, next) {
    res.locals.login = req.isAuthenticated();
    res.locals.user = req.user;
    res.locals.monitorName = nconf.get("global:monitorName");
    next();
});

var nconf = require('nconf');
var confFile = './config/config.json';
var conf_backup = './config/backup.json';

nconf.file({ file: confFile });
nconf.load();

router.use(bodyParser.json());       // to support JSON-encoded bodies
router.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

router.route('/settingsData')
    .get(authHelper.isAdmin, function (req, res, next) {
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
        let themes = [];
        fs.readdirSync('./themes').forEach(file => {
            themes.push(file)
        });
        // logger.main.debug(util.format('Plugin Config:\n\n%o',plugins));
        let data = { "settings": settings, "plugins": plugins, "themes": themes }
        res.json(data);
    })
    .post(authHelper.isAdmin, function (req, res, next) {
        nconf.load();
        if (req.body) {
            //console.log(req.body);
            var currentConfig = nconf.get();
            fs.writeFileSync(conf_backup, JSON.stringify(currentConfig, null, 2));
            fs.writeFileSync(confFile, JSON.stringify(req.body, null, 2));
            nconf.load();
            res.status(200).send({ 'status': 'ok' });
        } else {
            res.status(400).send({ error: 'request body empty' });
        }
    });

router.get('*', authHelper.isAdminGUI, function (req, res, next) {
    res.render('admin', { pageTitle: 'Admin' });
});

module.exports = router;
