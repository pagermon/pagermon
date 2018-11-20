var push = require('pushover-notifications');

function run(event, scope, data, config, callback) {
    var pConf = data.pluginconf.Pushover;
    if (pConf && pConf.enable) {
        //ensure key has been entered before trying to push
        if (pConf.group == 0 || pConf.group == '0' || !pConf.group) {
            console.error('Pushover: ' + data.address + ' No User/Group key set. Please enter User/Group Key.');
            callback();
          } else {
            var p = new push({
              user: pConf.group,
              token: config.pushAPIKEY,
            });
            
            var msg = {
              message: data.message,
              title: data.agency+' - '+data.alias,
              sound: pConf.sound.value,
              priority: pConf.priority.value,
              onerror: function(err) {
                console.log('Pushover:', err);
                }
            };

            if (pConf.priority.value == 2 || pConf.priority.value == '2') {
              //emergency message
              msg.retry = 60;
              msg.expire = 240;
              console.log("SENDING EMERGENCY PUSH NOTIFICATION")
            }

            p.send(msg, function (err, result) {
              if (err) { console.error('Pushover:' + err); }
              console.log('Pushover:' + result);
              callback();
            });
          }
    } else {
        callback();
    }

}

module.exports = {
    run: run
}
