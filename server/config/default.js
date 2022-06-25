const crypto = require('crypto');

const defaultConfig = {
        port: 3000,
        global: {
                theme: 'default',
                monitorName: 'PagerMon',
                searchLocation: 'bottom',
                loglevel: 'debug',
                frontPopupEnable: false,
                frontPopupTitle: '',
                frontPopupContent: '',
                sessionSecret: crypto.randomBytes(20).toString('hex'),
        },
        database: {
                file: './messages.db',
                type: 'sqlite3',
        },
        messages: {
                maxLimit: 120,
                defaultLimit: 20,
                duplicateFiltering: true,
                duplicateLimit: 10,
                duplicateTime: 60,
                rotationEnabled: true,
                rotateDays: 7,
                rotateKeep: 4,
                pdwMode: false,
                adminShow: false,
                HideCapcode: false,
                HideSource: false,
                apiSecurity: false,
        },
        auth: {
                registration: false,
                user: 'admin',
                encPass: '$2a$08$De/aXnQkZIEbQ9p8J22tHuzLltqIbsAxE2CGgRMPLaaIwwHmVrpsu',
                keys: [],
        },
        monitoring: {
                azureEnable: false,
                azureKey: '',
                gaEnable: false,
                gaTrackingCode: '',
        },
        plugins: {},
};

module.exports = defaultConfig;
