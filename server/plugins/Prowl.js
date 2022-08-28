const Prowl = require('node-prowl');
const logger = require('../log');
const _ = require('underscore');

function run(trigger, scope, data, config, callback) {
  const pConf = data.pluginconf.Prowl;
  if (!pConf || !pConf?.enable) return callback();

  // ensure key has been entered before trying to push
  if (pConf.group === 0 || pConf.group === '0' || !pConf.group) {
    logger.main.error(`Prowl: No User/Group key set. Please enter User/Group Key.`);
    return callback();
  }

  const keys = _.map(pConf.group.split(/[;,]/), key => {
    key.trim();
  }).join(',');

  const prowl = new Prowl(keys);

  const payload = {
    url: pConf?.url?.value,
    priority: pConf?.priority?.value,
    providerkey: pConf?.providerkey?.value,
  };

  const event = `${data.agency} - ${data.alias}`;
  payload.description = `${data.message} \nTime: ${new Date().toLocaleString()}`;

  if (pConf.priority === 2 || pConf.priority === '2') {
    // emergency message
    logger.main.info('SENDING EMERGENCY MESSAGE: PROWL');
  }

  prowl.push(event, config.application, payload, function(err, remaining) {
    if (err) {
      logger.main.error(`Prowl:${err}`);
    }
    logger.main.debug(`Prowl: Message sent. ${remaining} messages remaining for this hour.`);
    callback();
  });
}

module.exports = {
  run,
};
