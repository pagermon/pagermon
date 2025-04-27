const fs = require('fs');
const nconf = require('nconf');
const util = require('util');
const logger = require('../log');

async function handle(trigger, scope, initialMessage, callback) {
        const plugins = nconf.get('plugins');
        logger.main.debug('======================');
        logger.main.debug(`trigger: ${trigger} scope: ${scope}`);
        logger.main.debug('======================');
        logger.main.debug('data object');
        logger.main.debug(util.format('%o', initialMessage));
        logger.main.debug('plugins object');
        logger.main.debug(util.format('%o', plugins));
        logger.main.debug('======================');

        let message = initialMessage;

        const promises = Object.keys(plugins).map(async (pluginConfig, pluginName) => {
                logger.main.debug('======================');
                logger.main.debug(`plugin: ${pluginName}`);
                // note: fs and require use different paths
                if (!pluginConfig.enable) return;
                if (!fs.existsSync(`./plugins/${pluginName}.json`) || !fs.existsSync(`./plugins/${pluginName}.js`))
                        return logger.main.error(`Invalid plugin ${pluginName} - could not find json or js file`);

                const pConfig = require(`./${pluginName}.json`);
                // check scope
                if (pConfig.trigger !== trigger || pConfig.scope !== scope || pConfig.disable)
                        return logger.main.debug('Plugin does not run in this scope');

                logger.main.debug('RUNNING PLUGIN!');
                const plugin = require(`./${pluginName}`);
                plugin.run(trigger, scope, message, pluginConfig, function (response, error) {
                        if (error) logger.main.error(error);
                        if (response) message = response;
                        /* TODO: Doesn't seem logic to me, but that is, what the plugin did before.
                         * This means, that the plugin can change the message object, but changes will be wildly overwritten by other plugins.
                         * They do not run concurrently, so we can't even predict, which plugin will get which version.
                         * Only way would be to run them in sequence (taking more time), have some way to merge responses or to define some kind of running order.
                         */
                });
        });

        await Promise.allSettled(promises);
        callback(message);
}

module.exports = {
        handle,
};
