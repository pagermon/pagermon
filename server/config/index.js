const nconf = require('nconf');

const configurationFile = './config/config.json';

nconf.argv()
        .env()
        .file({ file: configurationFile })
        .defaults({
                PORT: 3000,
        });
nconf.load();

module.exports = nconf;
