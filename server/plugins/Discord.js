const discordLib = require('discord.js'); // TODO: update!
const toHex = require('colornames');
const logger = require('../log');
const util = require('util');

async function run(trigger, scope, data, config, callback) {
        const dConf = data.pluginconf.Discord;
        if (!(dConf && dConf.enable)) return callback();

        // var hostname = nconf.get('hostname');
        const hostname = process.env.HOSTNAME || '';
        // Ensure webhook ID and Token have been entered into the alias.
        if (dConf.webhook === 0 || !dConf.webhook) {
                logger.main.error(`Discord: ${data.address} No Webhook URL set. Please enter Webhook URL.`);
                return callback();
        }
        // we should probably not do this and take the id/token separately
        const webhook = dConf.webhook.split('/');
        const discordWebhookId = webhook[5];
        const dicordWebhookToken = webhook[6];

        const discord = new discordLib.WebhookClient(discordWebhookId, dicordWebhookToken);

        // Use embedded discord notification format from discord.js
        const notificationEmbed = new discordLib.RichEmbed({
                timestamp: new Date(),
        });
        // toHex doesn't support putting HEX in, needs to check and skip over if already hex.
        const isHex = /^#[0-9A-F]{6}$/i.test(data.color);
        const discordColor = !isHex ? toHex(data.color) : data.color;

        notificationEmbed.setColor(discordColor);
        notificationEmbed.setTitle(`**${data.agency} - ${data.alias}**`);
        notificationEmbed.setDescription(`${data.message}`);

        if (!hostname) logger.main.debug('Discord: Hostname not set in config file using pagermon github');
        notificationEmbed.setAuthor('PagerMon', '', hostname || `https://github.com/davidmckenzie/pagermon`);

        // Print notification template when debugging enabled
        logger.main.debug(util.format('%o', notificationEmbed));
        try {
                await discord.send(notificationEmbed);
                logger.main.info(`Discord: Message Sent`);
        } catch (error) {
                logger.main.error(`Discord: ${logger.main.error(error)}`);
        }

        callback();
}

module.exports = {
        run,
};
