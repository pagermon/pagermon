const bodyParser = require('body-parser');
const fs = require('fs');
const nconf = require('nconf');
const router = require('express').Router();

const authHelper = require('../middleware/authhelper');

const configFile = './config/config.json';
const configBackup = './config/backup.json';

router.use(function (req, res, next) {
        res.locals.login = req.isAuthenticated();
        res.locals.user = req.user;
        res.locals.monitorName = nconf.get('global:monitorName');
        next();
});

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({ extended: true }));

router.route('/settingsData')
        .get(authHelper.isAdmin, function (req, res, next) {
                const settings = nconf.get();

                const plugins = [];
                fs.readdirSync('./plugins').forEach((file) => {
                        if (file.endsWith('.json')) {
                                const pConf = require(`../plugins/${file}`);
                                if (!pConf.disable) plugins.push(pConf);
                        }
                });

                const themes = [];
                fs.readdirSync('./themes').forEach((file) => {
                        themes.push(file);
                });

                res.json({ settings, plugins, themes });
        })
        .post(authHelper.isAdmin, function (req, res, next) {
                if (!req.body) return res.status(400).send({ error: 'request body empty' });

                const currentConfig = nconf.get();
                fs.writeFileSync(configBackup, JSON.stringify(currentConfig, null, 2));
                fs.writeFileSync(configFile, JSON.stringify(req.body, null, 2));

                res.status(200).send({ status: 'ok' });
        });

router.get('*', authHelper.isAdminGUI, function (req, res, next) {
        res.render('admin', { pageTitle: 'Admin' });
});

module.exports = router;
