var request = require('request')

function run(trigger, scope, data, config, callback) {
    var msConf = data.pluginconf.MicrosoftTeams;
    if (msConf && msConf.enable) {
        //Ensure webhook ID and Token have been entered into the alias. 
        if (msConf.webhookuri == 0 || !msConf.webhookuri) {
            console.error('MSTeams: ' + data.address + ' No Webhook URL set. Please enter Webhook URL.');
            callback();
        } else {
            var uri = msConf.webhookuri
            var messageData = {
                title: data.agency + ' - ' + data.alias,
                text: data.message
            }

            request.post({
                url: uri,
                json: true,
                headers: {
                    "content-type": "application/json",
                },
                body: messageData
            }, function (error, response, body) {
                if (!error && response.statusCode === 200) {
                    console.log('Teams: Message Sent')
                }
                else {
                    console.log("Teams: " + error + response.statusCode + response.statusText)
                }
            })
            callback();
        }
    } else {
        callback();
    }
}

module.exports = {
    run: run
}
