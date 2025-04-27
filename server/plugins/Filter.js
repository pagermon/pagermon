const logger = require('../log');

function run(trigger, scope, data, config, callback) {
        if (config.ignoreallbutAddress && !data.address.match(new RegExp(config.ignoreallbutAddress))) {
                data.pluginData.ignore = true;
                logger.main.info('Filter: ignoring message due to no regex match on address');
        }
        if (config.ignoreallbutMessage && !data.message.match(new RegExp(config.ignoreallbutMessage))) {
                data.pluginData.ignore = true;
                logger.main.info('Filter: ignoring message due to no regex match on message');
        }
        if (config.ignoreAddress && data.address.match(new RegExp(config.ignoreAddress))) {
                data.pluginData.ignore = true;
                logger.main.info('Filter: ignoring message due to regex match on address');
        }
        if (config.ignoreMessage && data.message.match(new RegExp(config.ignoreMessage))) {
                data.pluginData.ignore = true;
                logger.main.info('Filter: ignoring message due to regex match on content');
        }
        callback(data);
}

module.exports = {
        run,
};
