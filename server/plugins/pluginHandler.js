var fs = require('fs');
var _ = require('underscore');
var nconf = require('nconf');
var conf_file = './config/config.json';
nconf.file({file: conf_file});
nconf.load();

function handle(event, scope, data) {
    var plugins = nconf.get("plugins");
    console.log('======================');
    console.log(`event: ${event} scope: ${scope}`);
    console.log('======================');
    console.log('data object');
    console.log(data);
    console.log('plugins object');
    console.log(plugins);
    console.log('======================');

    _.each(plugins, function(conf, plugin) {
        console.log('======================');
        console.log(`plugin: ${plugin}`);
        // note: fs and require use different paths
        if (conf.enable) {
            if (fs.existsSync(`./plugins/${plugin}.json`) && fs.existsSync(`./plugins/${plugin}.js`)) {
                let pConfig = require(`./${plugin}.json`);
                console.log(pConfig);
                // check scope
                if (pConfig.event == event && pConfig.scope == scope && !pConfig.disable) {
                    console.log('RUNNING PLUGIN!');
                    let pRun = require(`./${plugin}`);
                        pRun.run(event, scope, data, conf);
                } else {
                    console.log('Plugin does not run in this scope');
                }
            } else {
                console.log('Invalid plugin: ');
                console.log(plugin);
            }
        }
        console.log('======================');
    })
};

module.exports = {
    handle: handle
}