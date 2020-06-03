const axios = require('axios').default;
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
  let pConf = data.pluginconf.AdvancedWebhook;
  // Conditions for sending - alias enabled, sending all messages, sending defined aliases and this message has an alias
  if ((pConf && pConf.enable) || (config.filterMode.value == "2") || (config.filterMode.value == "1" && data.alias_id)) {
    // Get the template
    let dat = config.contentTemplate;

    // Replace placeholders with values
    dat = dat.replace("/address/", data.address);
    dat = dat.replace("/message/", data.message);
    dat = dat.replace("/source/", data.source);
    dat = dat.replace("/timestamp/", data.timestamp);
    dat = dat.replace("/alias_id/", data.alias_id);
    dat = dat.replace("/alias/", data.alias);
    dat = dat.replace("/agency/", data.agency);
    dat = dat.replace("/icon/", data.icon);
    dat = dat.replace("/color/", data.color);

    logger.main.debug('AdvancedWebhook: Sending to ' + config.URL + ': ' + dat);

    axios.post(config.URL, dat, {
      headers: {
        'Content-Type': config.contentType || 'application/json;charset=utf-8',
        'User-Agent': 'Pagermon - Advanced Webhook Plugin'
      },
      timeout: 5000, // Timeout 5s
    }).then(res => {
      logger.main.info('AdvancedWebhook: Message Sent');
    }).catch(error => {
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        logger.main.error('AdvancedWebhook: Headers: ' + JSON.stringify(error.response.headers));
        logger.main.error('AdvancedWebhook: Data: ' + error.response.data);
        logger.main.error('AdvancedWebhook: Status Code: ' + error.response.status);
      } else if (error.request) {
        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        logger.main.error('AdvancedWebhook: No response:' + error.request);
      } else {
        // Something happened in setting up the request that triggered an Error
        logger.main.error('AdvancedWebhook: Error:' +  error.message);
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
