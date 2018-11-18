var twit = require('twit');

function run(event, scope, data, config) {
    var tConf = data.pluginconf.Twitter;
    if (tConf && tConf.enable) {
        if ((config.consKey == 0 || !config.consKey) || (config.consSecret == 0 || !config.consSecret) || (config.accToken == 0 || !config.accToken) || (config.accSecret == 0 || !config.accSecret)) {
            console.error('Twitter: ' + data.address + ' No API keys set. Please check API keys.');
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
                if (err) { console.error('Twitter: ' + err); }else{ console.log('Twitter: ' + 'Tweet Posted')}
              })
        }
    } else {
        console.log("Twitter disabled on alias");
        console.log(data);
        console.log(config);
    }
}

module.exports = {
    run: run
}