const Slack = require('slack'); // TODO: Deprecated, find a better library
const logger = require('../log');

function run(trigger, scope, data, config, callback) {
        var slConf = data.pluginconf.Slack;
        if (!slConf || !slConf.enable) return callback();

        // Ensure webhook ID and Token have been entered into the alias.
        if (config.bottoken === 0 || !config.bottoken || slConf.channel === 0 || !slConf.channel) {
                logger.main.error(`Slack: ${data.address} No Bot Token or Channel Set.`);
                return callback();
        }
        const token = config.bottoken;
        const bot = new Slack({ token });
        const messageData = `*${data.agency} - ${data.alias}*\nMessage: ${data.message}`;

        bot.chat.postMessage(
                {
                        channel: slConf.channel,
                        text: messageData,
                },
                function(err, responseData, response) {
                        if (err) {
                                logger.main.error(`Slack: ${err}`);
                        } else {
                                logger.main.info('Slack: Message Sent');
                        }
                        callback();
                }
        );
}

module.exports = {
        run,
};
