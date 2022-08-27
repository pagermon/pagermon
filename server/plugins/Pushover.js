const Push = require('pushover-notifications');
const _ = require('underscore');
const logger = require('../log');

function run(trigger, scope, data, config, callback) {
  const pConf = data.pluginconf.Pushover;
  if (pConf && pConf.enable) {
    // ensure key has been entered before trying to push
    if (pConf.group === 0 || pConf.group === '0' || !pConf.group) {
      logger.main.error(`Pushover: ${data.address} No User/Group key set. Please enter User/Group Key.`);
      return callback();
    }

    // Split the entered keys on comma or semicolon, trim any whitespace and
    // join them back together to one string using a comma, since Pushover
    // API does accept comma-seperated lists of keys.

    const keys = _.map(pConf.group.split(/(,|;)/g), key => {
      key.trim();
    }).join(',');

    const p = new Push({
      user: keys,
      token: config.pushAPIKEY,
    });

    const sound = pConf.sound?.value;
    const priority = pConf.priority?.value || 0;
    const timestamp = pConf.timestamp?.value ? data.timestamp : undefined;

    const msg = {
      message: data.message,
      title: `${data.agency} - ${data.alias}`,
      sound,
      priority,
      timestamp,
      onerror(err) {
        logger.main.error('Pushover:', err);
      },
    };

    if (priority === 2 || priority === '2') {
      // emergency message
      msg.retry = 60;
      msg.expire = 240;
      logger.main.info('SENDING EMERGENCY PUSH NOTIFICATION');
    }

    p.send(msg, function(err, result) {
      if (err) {
        logger.main.error(`Pushover:${err}`);
      }
      logger.main.debug(`Pushover:${result}`);
      callback();
    });
  } else {
    callback();
  }
}

module.exports = {
  run,
};
