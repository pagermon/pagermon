const axios = require('axios').default;
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
  let pConf = data.pluginconf.SimpleWebhook;
  // Conditions for sending - alias enabled, sending all messages, sending defined aliases and this message has an alias
  if ((pConf && pConf.enable) || (config.filterMode.value == "2") || (config.filterMode.value == "1" && data.alias_id)) {
    // Construct messages
    let message = {};

    if (config.sendAddress) message.address = data.address;
    if (config.sendMessage) message.message = data.message;
    if (config.sendSource) message.source = data.source;
    if (config.sendTimestamp) message.timestamp = data.timestamp;
    if (config.sendAliasId) message.alias_id = data.alias_id;
    if (config.sendAlias) message.alias = data.alias;
    if (config.sendAgency) message.agency = data.agency;
    if (config.sendIcon) message.icon = data.icon;
    if (config.sendColor) message.color = data.color;

    logger.main.debug('SimpleWebhook: Sending to ' + config.URL + ': ' + JSON.stringify(message));

    axios.post(config.URL, message, {
      headers: {
        'User-Agent': 'Pagermon - Simple Webhook Plugin'
      },
      timeout: 5000, // Timeout 5s
    }).then(res => {
      logger.main.info('SimpleWebhook: Message Sent');
    }).catch(error => {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        logger.main.error('SimpleWebhook: Headers: ' + JSON.stringify(error.response.headers));
        logger.main.error('SimpleWebhook: Data: ' + error.response.data);
        logger.main.error('SimpleWebhook: Status Code: ' + error.response.status);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        logger.main.error('SimpleWebhook: No response:' + error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        logger.main.error('SimpleWebhook: Error:' +  error.message);
      }
    });

    callback();
  } else {
    callback();
  }
}

module.exports = {
  run: run
}
