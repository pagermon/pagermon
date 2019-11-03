var request = require('request');
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
    var msConf = data.alias.pluginconf.MicrosoftTeams;
    if (msConf && msConf.enable) {
        //Ensure webhook ID and Token have been entered into the alias.
        if (msConf.webhookuri == 0 || !msConf.webhookuri) {
            logger.main.error('MSTeams: ' + data.address + ' No Webhook URL set. Please enter Webhook URL.');
            callback();
        } else {
            var uri = msConf.webhookuri;
            var messageData = {
                title: data.alias.agency + ' - ' + data.alias.alias,
                text: data.message
            };

            request.post({
                url: uri,
                json: true,
                headers: {
                    "content-type": "application/json",
                },
                body: messageData
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    logger.main.info('Teams: Message Sent')
                }
                else {
                    logger.main.error("Teams: " + error + response.statusCode + response.statusText)
                }
            });
            callback();
        }
    } else {
        callback();
    }
}

module.exports = {
    run: run
};
