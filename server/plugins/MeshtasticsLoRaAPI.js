var util = require('util');
var logger = require('../log');
const { exec } = require('child_process');
// data.message - The message to be sent
// data.pluginconf.MeshtasticsLoRaAPI.setURL - The channel URL
// data.pluginconf.MeshtasticsLoRaAPI.enable - Enable flag


function run(trigger, scope, data, config, callback) {
  // Check if the enable flag is set to true
  if (data.pluginconf.MeshtasticsLoRaAPI.enable === true) {
    // Check if the channelID and message variables exist and have values
    if (!data.pluginconf.MeshtasticsLoRaAPI.hasOwnProperty('channelID') || !data.hasOwnProperty('message') || !data.message) {
      logger.main.error('Missing channelID or message variable.');
      callback(data); // Pass the data to the callback function
      return;
    }


    // Build the command string
    // This will currently only work on Linux/Unix based machines.
    const command = `~/.local/bin/meshtastic --sendtext "${data.message}"  --ch-index ${data.pluginconf.MeshtasticsLoRaAPI.channelID}`;
    
    // Execute the command using child_process.exec
    exec(command, (error, stdout, stderr) => {
      if (error) {
        logger.main.error('Failed to send message:', error);
      } else {
        logger.main.info('Message sent successfully:', stdout);
      }
      callback(data); // Pass the data to the callback function
    });
  } else {
    logger.main.error('Meshtastics API is not enabled.');
    callback(data); // Pass the data to the callback function
  }
}

module.exports = {
  run: run
};
