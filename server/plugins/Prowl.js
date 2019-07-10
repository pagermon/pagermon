var Prowl = require('node-prowl');
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
    var pConf = data.pluginconf.Prowl;
    logger.main.debug(JSON.stringify(pConf));
    if (pConf && pConf.enable) {
        //ensure key has been entered before trying to push
        if (pConf.group == 0 || pConf.group == '0' || !pConf.group) {
          logger.main.error('Prowl: ' + data.address + ' No User/Group key set. Please enter User/Group Key.');
            callback();
          } else {
            var prowl =  new Prowl(pConf.group);

            var payload = {};
            
            if (pConf.url) {
              payload.url = pConf.url;
            }

            if (pConf.priority) {
              payload.priority = pConf.priority.value;
            }

            if (pConf.providerkey) {
              payload.providerkey = pConf.providerkey;
            }

            var event = data.agency+' - '+data.alias;
            payload.description = data.message + ' \nTime: '+ new Date().toLocaleString();

            if (pConf.priority == 2 || pConf.priority == '2') {
              //emergency message
              logger.main.info("SENDING EMERGENCY MESSAGE: PROWL");
            }

            logger.main.debug('Trying to send prowl.');
            logger.main.debug('Event: '+event);
            logger.main.debug('Application: '+config.application);
            logger.main.debug('Payload: '+payload);
            logger.main.debug(JSON.stringify(payload));

            prowl.push(event, config.application, payload, function (err, remaining) {
              if (err) { logger.main.error('Prowl:' + err); }
              logger.main.debug('Prowl: Message sent. ' + remaining + ' messages remaining');
              callback();
            });
          }
    } else {
        callback();
    }

}

module.exports = {
    run: run
};
