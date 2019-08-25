const winston = require('winston');
const { format } = winston;
// const { combine, label, json, cli } = format;
// load the config file
var nconf = require('nconf');
var conf_file = './config/config.json';
nconf.file({file: conf_file});
nconf.load();

var loglevel = nconf.get('global:loglevel');

winston.loggers.add('pagermon', {
    format: format.combine(
        format.colorize(),
        format.label({ label: '[pmon]' }),
        format.timestamp({format:"YYYY-MM-DD HH:mm:ss"}),
        format.prettyPrint(),
        format.printf(
            info => `${info.label}  ${info.timestamp}  ${info.level} : ${info.message}`
        )
    ),
    transports: [
        new winston.transports.File({
            level: loglevel,
            filename: './logs/pagermon.log',
            handleExceptions: true,
            maxsize: 10485760,
            maxFiles: 5
        }),
        new winston.transports.Console({
            level: loglevel,
            handleExceptions: true
        })
    ]
});

winston.loggers.add('http', {
    format: format.combine(
        format.colorize(),
        format.label({ label: '[http]' }),
        format.timestamp({format:"YYYY-MM-DD HH:MM:SS"}),
        format.printf(
            info => `${info.message}`
        )
    ),
    transports: [
        new winston.transports.File({
            level: 'debug',
            filename: './logs/http.log',
            handleExceptions: true,
            maxsize: 10485760,
            maxFiles: 5
        }),
        new winston.transports.Console({
            level: loglevel,
            handleExceptions: true
        })
    ]
});

winston.loggers.add('db', {
    format: format.combine(
        format.colorize(),
        format.label({ label: '[db]' }),
        format.timestamp({format:"YYYY-MM-DD HH:mm:ss"}),
        format.prettyPrint(),
        format.printf(
            info => `${info.label}  ${info.timestamp}  ${info.level} : ${info.message}`
        )
    ),
    transports: [
        new winston.transports.File({
            level: loglevel,
            filename: './logs/db.log',
            handleExceptions: true,
            maxsize: 10485760,
            maxFiles: 5
        }),
        new winston.transports.Console({
            level: loglevel,
            handleExceptions: true
        })
    ]
});

module.exports = {
    main: winston.loggers.get('pagermon'),
    http: winston.loggers.get('http'),
    db: winston.loggers.get('db')
}
module.exports.http.stream = {
    write: function(message, encoding){
        var httpLog = winston.loggers.get('http');
        httpLog.debug(message.substring(0,message.lastIndexOf('\n')));
    }
};
