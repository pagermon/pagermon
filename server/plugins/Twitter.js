var twit = require('twit');
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
    var tConf = data.pluginconf.Twitter;
    if (tConf && tConf.enable) {
        if ((config.consKey == 0 || !config.consKey) || (config.consSecret == 0 || !config.consSecret) || (config.accToken == 0 || !config.accToken) || (config.accSecret == 0 || !config.accSecret)) {
            logger.main.error('Twitter: ' + data.address + ' No API keys set. Please check API keys.');
            callback();
        } else {
            var tw = new twit({
                consumer_key: config.consKey,
                consumer_secret: config.consSecret,
                access_token: config.accToken,
                access_token_secret: config.accSecret,
              });
              
              var twittertext = `${data.agency} - ${data.alias} \n` +
                `${data.message} \n` +
                `${tConf.hashtag} ${config.globalHashtags}`;
              // TODO: this should limit chars of twittertext
              tw.post('statuses/update', {
                status: twittertext
              }, function (err, data, response) {
                if (err) { logger.main.error('Twitter: ' + err); }else{ logger.main.info('Twitter: ' + 'Tweet Posted')}
                callback();
              })
        }
    } else {
        callback();
    }
}

module.exports = {
    run: run
}