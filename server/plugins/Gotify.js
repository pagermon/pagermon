var http = require('http');
var https = require('https');
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
    let pConf = data.alias.pluginconf.Gotify;
    if (pConf && pConf.enable) {

        let port = 80; // default
        if (config.port) {
            port = parseInt(config.port);
        }

        let priority = 1; // default
        if (pConf.priority) {
            priority = parseInt(pConf.priority);
        }

        // POST data
        const dat = JSON.stringify({
            title: data.alias.agency + ' - ' + data.alias.alias,
            message: data.message,
            priority: priority
        });

        // POST Options
        let options = {
            hostname: config.URL,
            port: port,
            path: '/message',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Gotify-Key': config.APIKey
            }
        };

        let req;

        // SSL
        if (config.SSL) {
            // SSL POST Options
            options.rejectUnauthorized = false;

            // HTTPS request
            req = https.request(options, (res) => {
                logger.main.debug('Gotify: ' + res.statusCode);
                res.on('data', (d) => {
                    process.stdout.write(d)
                })
            });
        } else {
            // HTTP request
            req = http.request(options, (res) => {
                logger.main.debug('Gotify: ' + res.statusCode);
                res.on('data', (d) => {
                    process.stdout.write(d)
                })
            });

        }

        // HTTP error
        req.on('error', (error) => {
            logger.main.error('Gotify:' + error);
        });

        req.write(dat);
        req.end();
        callback();
    } else {
        callback();
    }

}

module.exports = {
    run: run
};
