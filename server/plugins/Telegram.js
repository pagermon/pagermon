var telegram = require('telegram-bot-api');
var util = require('util');
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
    var tConf = data.alias.pluginconf.Telegram;
    if (tConf && tConf.enable) {
        var telekey = config.teleAPIKEY;
        var t = new telegram({
          token: telekey
        });
        if (tConf.chat == 0 || !tConf.chat) {
            logger.main.error('Telegram: ' + data.address + ' No ChatID key set. Please enter ChatID.');
            callback();
        } else {
            //Notification formatted in Markdown for pretty notifications
            var notificationText = `*${data.alias.agency} - ${data.alias.alias}*\n` +
                                    `Message: ${data.message}`;

            t.sendMessage({
                chat_id: tConf.chat,
                text: notificationText,
                parse_mode: "Markdown"
            }).then(function(data) {
                logger.main.debug('Telegram: ' + util.inspect(data, false, null));
                callback();
            }).catch(function(err) {
                logger.main.error('Telegram: ' + err);
                callback();
            });
        }
    } else {
        callback();
    }
}

module.exports = {
    run: run
};
