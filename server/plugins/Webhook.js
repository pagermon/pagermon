var http = require('http');
var https = require('https');
var url = require('url');
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
    let pConf = data.pluginconf.Webhook;
    if (pConf && pConf.enable) {
        // POST data
        const dat = JSON.stringify({
            title: data.agency+' - '+data.alias,
            message: data.message
        });

        // Parse URL
        const webhookUrl = url.parse(config.URL);

        // POST Options
        let options = {
            method: 'POST',
            hostname: webhookUrl.hostname,
            port: webhookUrl.port,
            path: webhookUrl.path,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        let req;

        // SSL
        if (webhookUrl.protocol == 'https:') {
            // SSL POST Options
            options.rejectUnauthorized = false;

            // HTTPS request
            req = https.request(options, (res) => {
                logger.main.debug('Webhook: ' + res.statusCode);
                res.on('data', (d) => {
                    process.stdout.write(d)
                })
            });
        } else {
            // HTTP request
            req = http.request(options, (res) => {
                logger.main.debug('Webhook: ' + res.statusCode);
                res.on('data', (d) => {
                    process.stdout.write(d)
                })
            });

        }

        // HTTP error
        req.on('error', (error) => {
            logger.main.error('Webhook:' + error);
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
}
