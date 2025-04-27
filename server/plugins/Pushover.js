const Push = require('pushover-notifications');
const logger = require('../log');

function run(trigger, scope, data, config, callback) {
        const pConf = data.pluginconf.Pushover;
        if (!pConf || !pConf.enable) return callback();
        // ensure key has been entered before trying to push
        if (pConf.group === 0 || pConf.group === '0' || !pConf.group) {
                logger.main.error(`Pushover: ${data.address} No User/Group key set. Please enter User/Group Key.`);
                return callback();
        }
        const p = new Push({
                user: pConf.group,
                token: config.pushAPIKEY,
        });

        const msg = {
                message: data.message,
                title: `${data.agency} - ${data.alias}`,
                priority: pConf.priority.value || 0,
                onerror(err) {
                        logger.main.error('Pushover:', err);
                },
        };
        if (pConf.sound) msg.pushSound = pConf.sound.value;
        if (Number(msg.priority) === 2) {
                // emergency message
                msg.retry = 60;
                msg.expire = 240;
                logger.main.info('SENDING EMERGENCY PUSH NOTIFICATION');
        }

        p.send(msg, function (err, result) {
                if (err) {
                        logger.main.error(`Pushover: ${err}`);
                }
                logger.main.debug(`Pushover: ${result}`);
                callback();
        });
}

module.exports = {
        run,
};
