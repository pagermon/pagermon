const nconf = require('nconf');

const configurationFile = './config/config.json';
const defaults = require('./default');

nconf.argv()
        .env()
        .file({ file: configurationFile })
        .defaults(defaults);
nconf.load();

module.exports = nconf;
