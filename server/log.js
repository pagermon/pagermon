const winston = require('winston');
const nconf = require('nconf');

const { format } = winston;

const loglevel = nconf.get('global:loglevel');

function createLogger(name, options) {
        return winston.loggers.add(name, {
                format: format.combine(
                        format.colorize(),
                        format.label({ label: options?.label || name }),
                        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                        format.prettyPrint(),
                        format.printf(
                                (info) =>
                                        options?.format ||
                                        `${info.label}  ${info.timestamp}  ${info.level} : ${info.message}`
                        )
                ),
                transports: [
                        new winston.transports.File({
                                level: options?.logLevel?.file || loglevel,
                                filename: `./logs/${options?.filename || name}.log`,
                                handleExceptions: true,
                                maxsize: 10485760,
                                maxFiles: 5,
                        }),
                        new winston.transports.Console({
                                level: options?.logLevel?.console || loglevel,
                                handleExceptions: true,
                        }),
                ],
        });
}

createLogger('pagermon', {
        label: '[pmon]',
});

createLogger('http', {
        format: format.printf((info) => `${info.message}`),
        logLevel: {
                file: 'debug',
        },
});

createLogger('db');

createLogger('auth');

module.exports = {
        main: winston.loggers.get('pagermon'),
        http: winston.loggers.get('http'),
        db: winston.loggers.get('db'),
        auth: winston.loggers.get('auth'),
        createLogger,
};

module.exports.http.stream = {
        write(message) {
                const httpLog = winston.loggers.get('http');
                httpLog.debug(message.substring(0, message.lastIndexOf('\n')));
        },
};
