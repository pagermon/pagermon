var telegram = require('telegram-bot-api');
var util = require('util');
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
    var tConf = data.pluginconf.Telegram;
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
            var notificationText = `<b>${escapeTelegramHTML(data.agency)} - ${escapeTelegramHTML(data.alias)}</b>\n` + 
                                    `Message: ${escapeTelegramHTML(data.message)}`;
            
            t.sendMessage({
                chat_id: tConf.chat,
                text: notificationText,
                parse_mode: "HTML"
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

function escapeTelegramHTML (string) {
    return string.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

module.exports = {
    run: run
}
