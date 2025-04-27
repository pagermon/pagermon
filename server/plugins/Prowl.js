const Prowl = require('node-prowl');
const logger = require('../log');

function run(trigger, scope, data, config, callback) {
        const pConf = data.pluginconf.Prowl;
        if (!pConf || !pConf.enable) return callback();

        // ensure key has been entered before trying to push
        if (pConf.group === 0 || pConf.group === '0' || !pConf.group) {
                logger.main.error(`Prowl: ${data.address} No User/Group key set. Please enter User/Group Key.`);
                return callback();
        }
        const prowl = new Prowl(pConf.group);

        const payload = {
                url: pConf.url,
        };

        if (pConf.priority) payload.priority = pConf.priority.value;

        if (pConf.providerkey) payload.providerkey = pConf.providerkey;

        const event = `${data.agency} - ${data.alias}`; // TODO: Maybe add a templating language for those plugins?
        payload.description = `${data.message} \nTime: ${new Date().toLocaleString()}`;

        if (pConf.priority === 2 || pConf.priority === '2') logger.main.info('SENDING EMERGENCY MESSAGE: PROWL');

        prowl.push(event, config.application, payload, function (err, remaining) {
                if (err) logger.main.error(`Prowl: ${err}`);
                else logger.main.debug(`Prowl: Message sent. ${remaining} messages remaining for this hour.`);
                callback();
        });
}

module.exports = {
        run,
};
