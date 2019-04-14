var https = require('http');
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
    var pConf = data.pluginconf.Gotify;
    if (pConf && pConf.enable) {
        let port = 80; // default
        if (config.port) {
            port = parseInt(config.port);
        }

        let priority = 1; // default
        if (pConf.priority) {
            priority = parseInt(pConf.priority);
        }

        const dat = JSON.stringify({
            title: data.agency+' - '+data.alias,
            message: data.message,
            priority: priority
        });

        const options = {
            hostname: config.URL,
            port: port,
            path: '/message',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Gotify-Key': config.APIKey
            }
        };

        const req = https.request(options, (res) => {
            logger.main.debug('Gotify statusCode:' + res.statusCode);
            res.on('data', (d) => {
                process.stdout.write(d)
            })
        });

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
}
