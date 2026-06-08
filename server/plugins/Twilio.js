var twilio = require('twilio');
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
    var tConf = data.pluginconf.Twilio;

    if (tConf && tConf.enable) {
        if (!config.accountSid || !config.authToken || !config.from) {
            logger.main.error('Twilio: Missing global config values. Check Account SID, Auth Token, and From Number.');
            return callback();
        }

        if (!tConf.to) {
            logger.main.error('Twilio: ' + data.address + ' No destination number set. Please enter Recipient Number.');
            return callback();
        }

        var client = twilio(config.accountSid, config.authToken);
        var messageBody = data.agency + ' - ' + data.alias + '\n' + data.message;

        client.messages.create({
            from: config.from,
            to: tConf.to,
            body: messageBody
        }).then(function(message) {
            logger.main.info('Twilio: Message sent with SID: ' + message.sid);
            callback();
        }).catch(function(err) {
            logger.main.error('Twilio: ' + err);
            callback();
        });
    } else {
        callback();
    }
}

module.exports = {
    run: run
}
