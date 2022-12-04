const Telegram = require('telegram-bot-api');
const _ = require('underscore');
const util = require('util');
const logger = require('../log');

function run(trigger, scope, data, config, callback) {
  const tConf = data.pluginconf?.Telegram;

  if (!tConf.enable) {
    return callback();
  }

  const telegram = new Telegram({
    token: config.teleAPIKEY,
  });

  if (tConf.chat === 0 || !tConf.chat) {
    logger.main.error(`Telegram: ${data.address} No ChatID key set. Please enter ChatID.`);
    return callback();
  }

  // Split chat IDs by comma or semicolon, trim whitespace, make array of it.
  const chatIds = _.chain(tConf.chat.split(/[;,]/))
    .map(chatId => chatId.trim())
    .filter(chatId => chatId.length);

  // Notification formatted in Markdown for pretty notifications
  const notificationText = `*${data.agency} - ${data.alias}*\nMessage: ${data.message}`;

  chatIds.forEach(chatId => {
    sendMessage(chatId, notificationText, telegram);
  });
  callback();
}

async function sendMessage(chatId, text, telegram) {
  const message = { chat_id: chatId, text };

  if (chatId.length < 0) return logger.main.error(`Telegram: Invalid chat ID ${chatId} was provided.`);

  try {
    const apiResponse = await telegram.sendMessage(message);
    logger.main.debug(`Telegram: ${util.inspect(apiResponse, false, null)}`);
  } catch (error) {
    logger.main.error(`Telegram: Failed to send message: ${error.message}`);
  }
}

module.exports = {
  run,
};
