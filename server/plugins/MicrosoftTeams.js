const axios = require('axios').default;
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
  var msConf = data.pluginconf.MicrosoftTeams;
  if (msConf && msConf.enable) {
    //Ensure webhook ID and Token have been entered into the alias. 
    if (msConf.webhookuri == 0 || !msConf.webhookuri) {
      logger.main.error('MSTeams: ' + data.address + ' No Webhook URL set. Please enter Webhook URL.');
    } else {
      const message = {
        title: data.agency + ' - ' + data.alias,
        text: data.message,
      };

      logger.main.debug('MSTeams: Sending to ' + msConf.webhookuri + ': ' + JSON.stringify(message));

      axios.post(msConf.webhookuri, message, {
        timeout: 5000, // Timeout 5s
      }).then(res => {
        logger.main.info('MSTeams: Message Sent');
      }).catch(error => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          logger.main.error('MSTeams: Headers: ' + JSON.stringify(error.response.headers));
          logger.main.error('MSTeams: Data: ' + error.response.data);
          logger.main.error('MSTeams: Status Code: ' + error.response.status);
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          logger.main.error('MSTeams: No response:' + error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          logger.main.error('MSTeams: Error:' +  error.message);
        }
      });
    }
    callback();
  } else {
    callback();
  }
}

module.exports = {
  run: run
}
