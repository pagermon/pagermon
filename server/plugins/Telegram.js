                                                                                               
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
            var notificationText = `*${data.agency} - ${data.alias}*\n` +
                `Message: ${data.message}`;
            logger.main.info('Sending to the following Chats ' + tConf.chat);

            var chatIds = tConf.chat.split(',');
            chatIds.forEach(function (chat_id) {
                sendMessage(chat_id.trim(), notificationText, t);
		});
	    callback();
       }
    } else {
        callback();
    }
}

function sendMessage(chat_id, notificationText, t) {
    logger.main.info('current.id: ' + chat_id);
    t.sendMessage({
        chat_id: chat_id,
        text: notificationText
    }).then(function (data) {
        logger.main.debug('Telegram: ' + util.inspect(data, false, null));
    }).catch(function (err) {
        logger.main.error('Telegram: ' + err);
    });
}




module.exports = {
    run: run
}
