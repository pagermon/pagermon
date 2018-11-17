var fs = require('fs');
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

    plugins.forEach(plugin => {
        console.log('======================');
        console.log(`plugin: ${plugin.name}`);
        // note: fs and require use different paths
        if (fs.existsSync(`./plugins/${plugin.name}.json`) && fs.existsSync(`./plugins/${plugin.name}.js`)) {
            let pConfig = require(`./${plugin.name}.json`);
            console.log(pConfig);
            // check scope
            if (pConfig.event == event && pConfig.scope == scope) {
                console.log('RUNNING PLUGIN!');
                let pRun = require(`./${plugin.name}`);
                    pRun.run(event, scope, data, plugin.config);
            } else {
                console.log('Plugin does not run in this scope');
            }
        } else {
            console.log('Invalid plugin: ');
            console.log(plugin);
        }
        console.log('======================');
    })
};

module.exports = {
    handle: handle
}