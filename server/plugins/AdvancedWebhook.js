var http = require('http');
var https = require('https');
var url = require('url');
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
    let pConf = data.pluginconf.AdvancedWebhook;
    // Conditions for sending - alias enabled, sending all messages, sending defined aliases and this message has an alias
    if ((pConf && pConf.enable) || (config.filterMode.value == "2") || (config.filterMode.value == "1" && data.alias_id)) {
        // Get the template
        let dat = config.contentTemplate;

        // Replace placeholders with values
        dat = dat.replace("/address/", data.address);
        dat = dat.replace("/message/", data.message);
        dat = dat.replace("/source/", data.source);
        dat = dat.replace("/timestamp/", data.timestamp);
        dat = dat.replace("/alias_id/", data.alias_id);
        dat = dat.replace("/alias/", data.alias);
        dat = dat.replace("/agency/", data.agency);
        dat = dat.replace("/icon/", data.icon);
        dat = dat.replace("/color/", data.color);

        // Parse URL
        const webhookUrl = url.parse(config.URL);

        logger.main.debug('AdvancedWebhook: Sending ' + dat);
        logger.main.debug('AdvancedWebhook: To URL' + config.URL);

        // POST Options
        let options = {
            method: 'POST',
            hostname: webhookUrl.hostname,
            port: webhookUrl.port,
            path: webhookUrl.path,
            headers: {
                'Content-Type': config.contentType
            }
        };

        let req;

        // SSL
        if (webhookUrl.protocol == 'https:') {
            // SSL POST Options
            options.rejectUnauthorized = false;

            // HTTPS request
            req = https.request(options, (res) => {
                logger.main.debug('AdvancedWebhook: ' + res.statusCode);
                res.on('data', (d) => {
                    process.stdout.write(d)
                })
            });
        } else {
            // HTTP request
            req = http.request(options, (res) => {
                logger.main.debug('AdvancedWebhook: ' + res.statusCode);
                res.on('data', (d) => {
                    process.stdout.write(d)
                })
            });

        }

        // HTTP error
        req.on('error', (error) => {
            logger.main.error('AdvancedWebhook:' + error);
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
