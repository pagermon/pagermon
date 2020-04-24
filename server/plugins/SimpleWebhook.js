var http = require('http');
var https = require('https');
var url = require('url');
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
    let pConf = data.pluginconf.SimpleWebhook;
    // Conditions for sending - alias enabled, sending all messages, sending defined aliases and this message has an alias
    if ((pConf && pConf.enable) || (config.filterMode.value == "2") || (config.filterMode.value == "1" && data.alias_id)) {
        // Construct messages
        let message = {};

        if (config.sendAddress) message.address = data.address;
        if (config.sendMessage) message.message = data.message;
        if (config.sendSource) message.source = data.source;
        if (config.sendTimestamp) message.timestamp = data.timestamp;
        if (config.sendAliasId) message.alias_id = data.alias_id;
        if (config.sendAlias) message.alias = data.alias;
        if (config.sendAgency) message.agency = data.agency;
        if (config.sendIcon) message.icon = data.icon;
        if (config.sendColor) message.color = data.color;

        // Convert message to JSON data
        const dat = JSON.stringify(message);

        // Parse URL
        const webhookUrl = url.parse(config.URL);

        logger.main.debug('SimpleWebhook: Sending ' + dat);
        logger.main.debug('SimpleWebhook: To URL' + config.URL);

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
                logger.main.debug('SimpleWebhook: ' + res.statusCode);
                res.on('data', (d) => {
                    process.stdout.write(d)
                })
            });
        } else {
            // HTTP request
            req = http.request(options, (res) => {
                logger.main.debug('SimpleWebhook: ' + res.statusCode);
                res.on('data', (d) => {
                    process.stdout.write(d)
                })
            });

        }

        // HTTP error
        req.on('error', (error) => {
            logger.main.error('SimpleWebhook:' + error);
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
