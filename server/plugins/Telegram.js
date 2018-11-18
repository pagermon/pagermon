var telegram = require('telegram-bot-api');

function run(event, scope, data, config) {
    var telekey = config.teleAPIKEY;
    var t = new telegram({
      token: telekey
    });
    console.log(data);
    console.log(config);

                        // //check config to see if push is gloably enabled and for the alias
                        // if (teleenable == true && teleonoff == 1) {
                        //     //ensure chatid has been entered before trying to push
                        //     if (telechat == 0 || !telechat) {
                        //       console.error('Telegram: ' + address + ' No ChatID key set. Please enter ChatID.');
                        //     } else {
                        //       //Notification formatted in Markdown for pretty notifications
                        //       var notificationText = `*${row.agency} - ${row.alias}*\n` + 
                        //                              `Message: ${row.message}`;
                              
                        //       t.sendMessage({
                        //           chat_id: telechat,
                        //           text: notificationText,
                        //           parse_mode: "Markdown"
                        //       }).then(function(data) {
                        //         //uncomment below line to debug messages at the console!
                        //         console.log('Telegram: ' + util.inspect(data, false, null));
                        //       }).catch(function(err) {
                        //           console.log('Telegram: ' + err);
                        //       });
                        //     }
                        //   };
}

module.exports = {
    run: run
}