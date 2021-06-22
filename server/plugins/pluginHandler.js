var fs = require('fs');
var _ = require('underscore');
var async = require('async');
var nconf = require('nconf');
var util = require('util');
var confFile = './config/config.json';
nconf.file({file: confFile});
nconf.load();
var logger = require('../log');

function handle(trigger, scope, data, callback) {
    var plugins = nconf.get("plugins");
    logger.main.debug('======================');
    logger.main.debug(`trigger: ${trigger} scope: ${scope}`);
    logger.main.debug('======================');
    logger.main.debug('data object');
    logger.main.debug(util.format('%o',data));
    logger.main.debug('plugins object');
    logger.main.debug(util.format('%o',plugins));
    logger.main.debug('======================');

    async.eachOf(plugins, function(conf, plugin, cb) {
        logger.main.debug('======================');
        logger.main.debug(`plugin: ${plugin}`);
        // note: fs and require use different paths
        if (conf.enable) {
            if (fs.existsSync(`./plugins/${plugin}.json`) && fs.existsSync(`./plugins/${plugin}.js`)) {
                let pConfig = require(`./${plugin}.json`);
                // check scope
                if (pConfig.trigger == trigger && pConfig.scope == scope && !pConfig.disable) {
                    logger.main.debug('RUNNING PLUGIN!');
                    let pRun = require(`./${plugin}`);
                        pRun.run(trigger, scope, data, conf, function(response, error) {
                            if (error) logger.main.error(error);
                            if (response) data = response;
                            cb();
                        });
                } else {
                    logger.main.debug('Plugin does not run in this scope');
                    cb();
                }
            } else {
                logger.main.error(`Invalid plugin ${plugin} - could not find json or js file`);
                cb();
            }
        } else {
            cb();
        }
    }, function(err) {
        if (err) logger.main.error(err);
        callback(data);
    });

};

module.exports = {
    handle: handle
}