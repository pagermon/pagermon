var push = require('pushover-notifications');
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
    var pConf = data.pluginconf.Pushover || {};
    const subscriberKeys = (data.subscribers || []).map((user) => user.pushover).filter(Boolean);
    const hasSubscribers = subscriberKeys.length > 0;
    const enabled = pConf.enable || hasSubscribers;

    if (enabled) {
        const recipients = hasSubscribers ? subscriberKeys : [pConf.group];
        //ensure key has been entered before trying to push
        const validRecipients = recipients.filter((value) => value && value !== 0 && value !== '0');
        if (validRecipients.length === 0) {
          logger.main.error('Pushover: ' + data.address + ' No User/Group key set. Please enter User/Group Key.');
            callback();
          } else {
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

            let remaining = validRecipients.length;
            validRecipients.forEach(function (recipient) {
              var p = new push({
                user: recipient,
                token: config.pushAPIKEY,
              });
              p.send(msg, function (err, result) {
                if (err) { logger.main.error('Pushover:' + err); }
                logger.main.debug('Pushover:' + result);
                remaining--;
                if (remaining === 0) {
                  callback();
                }
              });
            });
          }
    } else {
        callback();
    }

}

module.exports = {
    run: run
}
