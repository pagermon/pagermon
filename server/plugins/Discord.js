var discord = require('discord.js');
var toHex = require('colornames');
var logger = require('../log');
var util = require('util');

function run(trigger, scope, data, config, callback) {
    var dConf = data.alias.pluginconf.Discord;
    if (dConf && dConf.enable) {
        // var hostname = nconf.get('hostname');
        var hostname = process.env.HOSTNAME || '';
        //Ensure webhook ID and Token have been entered into the alias.
        if (dConf.webhook == 0 || !dConf.webhook) {
            logger.main.error('Discord: ' + data.address + ' No Webhook URL set. Please enter Webhook URL.');
            callback();
        } else {
            // we should probably not do this and take the id/token separately
            var webhook = dConf.webhook.split('/');
            var discwebhookid = webhook[5];
            var discwebhooktoken = webhook[6];

            var d = new discord.WebhookClient(discwebhookid, discwebhooktoken);

            //Use embedded discord notification format from discord.js
            var notificationembed = new discord.RichEmbed({
                timestamp: new Date(),
            });
            // toHex doesn't support putting HEX in, needs to check and skip over if already hex.
            var isHex = /^#[0-9A-F]{6}$/i.test(data.color);
            if (!isHex || isHex == false) {
                var discordcolor = toHex(data.color)
            } else {
                var discordcolor = data.color
            }
            notificationembed.setColor(discordcolor);
            notificationembed.setTitle(`**${data.alias.agency} - ${data.alias.alias}**`);
            notificationembed.setDescription(`${data.message}`);
            if (hostname == undefined || !hostname) {
                logger.main.debug('Discord: Hostname not set in config file using pagermon github');
                notificationembed.setAuthor('PagerMon', '', `https://github.com/davidmckenzie/pagermon`);
            } else {
                notificationembed.setAuthor('PagerMon', '', `${hostname}`);
            }
            //Print notification template when debugging enabled
            logger.main.debug(util.format('%o',notificationembed));
            d.send(notificationembed)
                .then(
                    logger.main.info(`Discord: Message Sent`))
                .catch(function(err) {
                'Discord: ' + logger.main.error(err);
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
