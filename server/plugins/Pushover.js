var push = require('pushover-notifications');
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
    var pConf = data.pluginconf.Pushover;
    if (pConf && pConf.enable) {
        if (data.isToneOnly  && ( typeof config.processToneOnly == 'unknown' || config.processToneOnly.value == "never" ) ){
          logger.main.debug("processToneOnly=NEVER")
          callback();
          return;
        }

        //ensure key has been entered before trying to push
        if (pConf.group == 0 || pConf.group == '0' || !pConf.group) {
          logger.main.error('Pushover: ' + data.address + ' No User/Group key set. Please enter User/Group Key.');
            callback();
          } else {
          
            if ( data.isToneOnly && ( config.processToneOnly.value == "aliases" && ( typeof pConf.toneOnlyProcessAlias == "undefined" || !pConf.toneOnlyProcessAlias ) ) ){
              logger.main.debug("processToneOnly=aliases and toneOnlyProcessAlias=false -> Skipped")
              callback();
              return;
            }

            var p = new push({
              user: pConf.group,
              token: config.pushAPIKEY,
            });

            var pushSound;
            if (pConf.sound) {
              pushSound = pConf.sound.value;
            }

            var pushPri = 0; // default
            if (pConf.priority) {
              pushPri = pConf.priority.value;
            }
            
            var msg = {
              message: data.message,
              title: data.agency+' - '+data.alias,
              sound: pushSound,
              priority: pushPri,
              onerror: function(err) {
                logger.main.error('Pushover:', err);
                }
            };

            if (pushPri == 2 || pushPri == '2') {
              //emergency message
              msg.retry = 60;
              msg.expire = 240;
              logger.main.info("SENDING EMERGENCY PUSH NOTIFICATION")
            }

            p.send(msg, function (err, result) {
              if (err) { logger.main.error('Pushover:' + err); }
              logger.main.debug('Pushover:' + result);
              callback();
            });
          }
    } else {
        callback();
    }

}

module.exports = {
    run: run
}
