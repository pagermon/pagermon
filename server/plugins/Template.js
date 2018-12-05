/*

The `run` function is called on each event, only when the event and scope settings match in the associated JSON file

See README.md for more info

*/

function run(trigger, scope, data, config, callback) {
    data.test = 'test';
    // setTimeout(callback, 10000);
    if (data.source == 'TEST') {
        data.pluginData.ignore = true;
    } else if (data.source == 'TEST2') {
        data.pluginData.aliasId = 123;
    }
    callback(data);
}

module.exports = {
    run: run
}
