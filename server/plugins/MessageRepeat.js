/*

MessageRepeat plugin - Desigened to forward incomming messages to another server

*/
var request = require('request')
var logger = require('../log')

function run (trigger, scope, data, config, callback) {


  if (config.repeatURI) {
    var uri = config.repeatURI
    var apikey = config.repeatAPIKEY
    var do_not_forward = false;

    if (config.repeatUUID == 0 || !config.repeatUUID) {
        logger.main.console.error('MessageRepeat: UUID is not set - Please enter a UUID');
      }
    //Check for message loop
    if  (data.UUID == config.repeatUUID) {
      //Loop detected - Close
      logger.main.info('MessageRepeat: Loop detected - Message not forwarded')
      data.pluginData.ignore = true;
      var do_not_forward = true;
    }

    var messageData = {
      address: data.address,
      message: data.message,
      source: data.source,
      datetime: data.datetime,
      UUID: config.repeatUUID,
    }
    if (do_not_forward == false){
      request.post({
        url: uri,
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'content-type': 'application/json',
          'User-Agent': 'PagerMon Plugin - Message Repeat',
          apikey: apikey,
          json: true
        },
        form: messageData
      }, function (error, response, body) {
        if (error && response === undefined) {
          logger.main.error('MessageRepeat: ' + error.errno)
        } else if (!error && response.statusCode === 200) {
          logger.main.info('MessageRepeat: Message Sent')
        } else {
          logger.main.error('MessageRepeat: Status Code:' +  response.statusCode)
        }
      })
  }
    callback()
  } else {
    callback()
  }
}

module.exports = {
  run: run
}
