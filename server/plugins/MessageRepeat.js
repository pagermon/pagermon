/*

MessageRepeat plugin - Desigened to forward incomming messages to another server

*/
var request = require('request')
var logger = require('../log')

function run (trigger, scope, data, config, callback) {
  if (config.repeatURI) {
    var uri = config.repeatURI
    var apikey = config.repeatAPIKEY
    var messageData = {
      address: data.capcode,
      message: data.message,
      source: data.source
    }
    request.post({
      url: uri,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'PagerMon Plugin - Message Repeat',
        apikey: apikey
      },
      body: messageData
    }, function (error, response, body) {
      //if (!error && response.statusCode === 200) {
        //logger.main.info('MessageRepeat: Message Sent')
      //} else {
      //  logger.main.error('MessageRepeat: ' + error + response.statusCode + response.statusText)
      //}
      console.log('error:', error); // Print the error if one occurred
console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
console.log('body:', body); // Print the HTML for the Google homepage.
    })
    callback()
  } else {
    callback()
  }
}

module.exports = {
  run: run
}
