/**
 * MessageRepeat plugin
 * Desigened to forward incomming messages to another server
 */

const axios = require('axios').default;
var logger = require('../log')

function run (trigger, scope, data, config, callback) {
  if (config.repeatURI) {
    var do_not_forward = false;

    if (config.repeatUUID == 0 || !config.repeatUUID) {
      logger.main.console.error('MessageRepeat: UUID is not set - Please enter a UUID');
    }
    // Check for message loop
    if (data.UUID == config.repeatUUID) {
      // Loop detected - Close
      logger.main.info('MessageRepeat: Loop detected - Message not forwarded')
      data.pluginData.ignore = true;
      var do_not_forward = true;
    }

    if (do_not_forward == false){
      var message = {
        address: data.address,
        message: data.message,
        source: data.source,
        datetime: data.datetime,
        UUID: config.repeatUUID,
      };

      logger.main.debug('MessageRepeat: Sending to ' + config.repeatURI + ': ' + JSON.stringify(message));

      axios.post(config.repeatURI, message, {
        headers: {
          apikey: config.repeatAPIKEY,
        },
        timeout: 5000, // Timeout 5s
      }).then(res => {
        logger.main.info('MessageRepeat: Message Sent');
      }).catch(error => {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          logger.main.error('MessageRepeat: Headers: ' + JSON.stringify(error.response.headers));
          logger.main.error('MessageRepeat: Data :' + error.response.data);
          logger.main.error('MessageRepeat: Status Code: ' + error.response.status);
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          logger.main.error('MessageRepeat: No response:' + error.request);
        } else {
          // Something happened in setting up the request that triggered an Error
          logger.main.error('MessageRepeat: Error:' +  error.message);
        }
      });
    }

    callback()
  } else {
    callback()
  }
}

module.exports = {
  run: run
}
