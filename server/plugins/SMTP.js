const nodemailer = require('nodemailer');
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
    var sConf = data.pluginconf.SMTP;
    if (sConf && sConf.enable) {
        let smtpConfig = {
            host: config.server,
            port: config.port,
            secure: config.secure, // upgrade later with STARTTLS
            auth: {
              user: config.username,
              pass: config.password
            },
            tls: {
              // do not fail on invalid certs
              rejectUnauthorized: false
            }
        };
        let transporter = nodemailer.createTransport(smtpConfig,[])

        let mailOptions = {
          from: `"${config.mailFromName}" <${config.mailFrom}>`, // sender address
          to: sConf.mailto, // list of receivers
          subject: data.agency+' - '+data.alias, // Subject line
          text: data.message, // plain text body
          html: '<b>'+data.message+'</b>' // html body
        };

        // send mail with defined transport object
        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            logger.main.error('SMTP:' + error);
            callback();
          } else {
            logger.main.info('SMTP:' + 'Message sent: %s', info.messageId);
            callback();
          }
        });
    } else {
        callback();
    }
}

module.exports = {
    run: run
}