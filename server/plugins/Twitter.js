const Twit = require('twit');
const logger = require('../log');

function run(trigger, scope, data, config, callback) {
        const tConf = data.pluginconf.Twitter;
        if (!tConf || !tConf.enable) return callback();
        if (
                config.consKey === 0 ||
                !config.consKey ||
                config.consSecret === 0 ||
                !config.consSecret ||
                config.accToken === 0 ||
                !config.accToken ||
                config.accSecret === 0 ||
                !config.accSecret
        ) {
                logger.main.error(`Twitter: ${data.address} No API keys set. Please check API keys.`);
                return callback();
        }
        const twitter = new Twit({
                consumer_key: config.consKey,
                consumer_secret: config.consSecret,
                access_token: config.accToken,
                access_token_secret: config.accSecret,
        });

        const twittertext =
                `${data.agency} - ${data.alias} \n` +
                `${data.message} \n` +
                `${tConf.hashtag} ${config.globalHashtags}`;

        const posts = [];
        let index = 0;

        while (twittertext.length - index > 280) {
                posts.push(twittertext.slice(index, index + 278));
                index += 278;
        }
        const spacer = ' …';

        posts.forEach((post, i) => {
                // If its the last message dont add spacer
                twitter.post(
                        'statuses/update',
                        {
                                status: post + (i === posts.length - 1 ? '' : spacer),
                        },
                        function (err) {
                                if (err) {
                                        logger.main.error(`Twitter: ${err}`);
                                } else {
                                        logger.main.info(`Twitter: Tweet ${i}/${posts.length} Posted`);
                                }
                                callback();
                        }
                );
        });
}

module.exports = {
        run,
};
