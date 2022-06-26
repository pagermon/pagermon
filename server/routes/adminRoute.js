const authHelper = require('../middleware/authhelper');
const bodyParser = require('body-parser');
const config = require('../config');
const express = require('express');
const fs = require('fs');

const router = express.Router();
router.use(function(req, res, next) {
        res.locals.login = req.isAuthenticated();
        res.locals.user = req.user;
        res.locals.monitorName = config.get('global:monitorName');
        next();
});

const confFile = './config/config.json';
const backupConfig = './config/backup.json';

router.use(bodyParser.json()); // to support JSON-encoded bodies
router.use(
        bodyParser.urlencoded({
                // to support URL-encoded bodies
                extended: true,
        })
);

router.route('/settingsData')
        .get(authHelper.isAdmin, function(req, res, next) {
                config.load();
                const settings = config.get();
                // logger.main.debug(util.format('Config:\n\n%o',settings));
                const plugins = [];
                fs.readdirSync('./plugins').forEach(file => {
                        if (file.endsWith('.json')) {
                                // eslint-disable-next-line global-require, import/no-dynamic-require
                                const pConf = require(`../plugins/${file}`);
                                if (!pConf.disable) plugins.push(pConf);
                        }
                });
                const themes = [];
                fs.readdirSync('./themes').forEach(file => {
                        themes.push(file);
                });
                // logger.main.debug(util.format('Plugin Config:\n\n%o',plugins));
                const data = {
                        settings,
                        plugins,
                        themes,
                };
                res.json(data);
        })
        .post(authHelper.isAdmin, function(req, res, next) {
                config.load();
                if (req.body) {
                        // console.log(req.body);
                        const currentConfig = config.get();
                        fs.writeFileSync(backupConfig, JSON.stringify(currentConfig, null, 2));
                        fs.writeFileSync(confFile, JSON.stringify(req.body, null, 2));
                        config.load();
                        res.status(200).send({ status: 'ok' });
                } else {
                        res.status(400).send({ error: 'request body empty' });
                }
        });

router.get('*', authHelper.isAdminGUI, function(req, res, next) {
        res.render('admin', { pageTitle: 'Admin' });
});

module.exports = router;
