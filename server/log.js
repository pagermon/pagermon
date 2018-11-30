const winston = require('winston');
const { format } = winston;
// const { combine, label, json, cli } = format;

winston.loggers.add('pagermon', {
    format: format.combine(
        format.colorize(),
        format.label({ label: '[pagermon]' }),
        format.timestamp({format:"YYYY-MM-DD HH:MM:SS"}),
        format.printf(
            info => `${info.label}  ${info.timestamp}  ${info.level} : ${info.message}`
        )
    ),
    transports: [
        new winston.transports.File({
            level: 'info',
            filename: './logs/pagermon.log',
            handleExceptions: true,
            maxsize: 10485760,
            maxFiles: 5
        }),
        new winston.transports.Console({
            level: 'debug',
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
            info => `${info.label}  ${info.timestamp}  ${info.level} : ${info.message}`
        )
    ),
    transports: [
        new winston.transports.File({
            level: 'info',
            filename: './logs/http.log',
            handleExceptions: true,
            maxsize: 10485760,
            maxFiles: 5
        }),
        new winston.transports.Console({
            level: 'debug',
            handleExceptions: true
        })
    ]
});

module.exports = {
    main: winston.loggers.get('pagermon'),
    http: winston.loggers.get('http')
}
module.exports.http.stream = {
    write: function(message, encoding){
        var httpLog = winston.loggers.get('http');
        httpLog.info(message.substring(0,message.lastIndexOf('\n')));
    }
};