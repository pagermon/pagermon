
function run(trigger, scope, data, config, callback) {
    if (config.ignoreAddress) {
        if (data.address.match(new RegExp(config.ignoreAddress))) {
            data.pluginData.ignore = true;
            console.log('Filter: ignoring message due to regex match on address');
        }
    }
    if (config.ignoreMessage) {
        if (data.message.match(new RegExp(config.ignoreMessage))) {
            data.pluginData.ignore = true;
            console.log('Filter: ignoring message due to regex match on content');
        }
    }
    callback(data);
}

module.exports = {
    run: run
}
