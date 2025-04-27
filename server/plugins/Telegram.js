const TelegramApi = require('telegram-bot-api');
const util = require('util');
const logger = require('../log');

async function run(trigger, scope, data, config, callback) {
        try {
                const tConf = data.pluginconf.Telegram;
                if (!tConf || !tConf.enable) return callback();
                const telegramApiKey = config.teleAPIKEY;
                const telegram = new TelegramApi({
                        token: telegramApiKey,
                });
                if (tConf.chat === 0 || !tConf.chat) {
                        logger.main.error(`Telegram: ${data.address} No ChatID key set. Please enter ChatID.`);
                        return callback();
                }
                // Notification formatted in Markdown for pretty notifications
                const notificationText =
                        `<b>${escapeTelegramHTML(data.agency)} - ${escapeTelegramHTML(data.alias)}</b>\n` +
                        `Message: ${escapeTelegramHTML(data.message)}`;

                const responseData = await telegram.sendMessage({
                        chat_id: tConf.chat,
                        text: notificationText,
                        parse_mode: 'Markdown',
                });

                logger.main.debug(`Telegram: ${util.inspect(responseData, false, null)}`);
                callback();
        } catch (error) {
                logger.main.error(`Telegram: ${error}`);
                callback();
        }
}

function escapeTelegramHTML(string) {
        return string.replace(/</, '&lt;').replace(/>/, '&gt;'.replace(/&/, '&amp;'));
}

module.exports = {
        run,
};
