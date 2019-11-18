var nconf = require('nconf');
var conf_file = './config/config.json';
var logger = require('./log');
var loglevel = nconf.get('global:loglevel');

if(loglevel = 'debug') {
  var debugon = true
} else {
  var debugon = false
}

var dbtype = nconf.get('database:type');

//in order to create migration files, client must be hardcoded to 'sqlite3' otherwise it won't work. 
var dbconfig = {
    client: dbtype,
        connection: {},
    useNullAsDefault: true,
    debug: debugon,
    migrations: {
      tableName: 'knex_migrations',
      directory: __dirname + '/knex/migrations'
    },
    log: {
      warn(message) {
        logger.db.info(JSON.stringify(message))
      },
      error(message) {
        logger.db.error(JSON.stringify(message))
      },
      deprecate(message) {
        logger.db.info(JSON.stringify(message))
      },
      debug(message) {
        logger.db.debug(JSON.stringify(message))
      },
    }
}

if (dbtype == 'sqlite3') {
  dbconfig.client.connection.filename = nconf.get('database:file');
} else if (dbtype == 'sqlite3') {
  dbconfig.client.connection.host = nconf.get('database:server');
  dbconfig.client.connection.user = nconf.get('database:username');
  dbconfig.client.connection.password = nconf.get('database:password');
  dbconfig.client.connection.database = nconf.get('database:database');
} else if (dbtype == 'oracledb') {
  dbconfig.client.connection.connectString = nconf.get('database:connectString');
  dbconfig.client.connection.user = nconf.get('database:username');
  dbconfig.client.connection.password = nconf.get('database:password');
}

//this is required because of the silly way knex migrations handle environments 
module.exports = Object.assign({}, dbconfig, {
  development: dbconfig,
  staging: dbconfig,
  production: dbconfig,
});
