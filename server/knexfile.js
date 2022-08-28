var nconf = require('nconf');
var confFile = './config/config.json';
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
    seeds: {
      directory: __dirname + '/knex/seeds'
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
if(process.env.NODE_ENV === 'test') {
  dbconfig.connection.filename = './test/messages.db'
}else if (dbtype == 'sqlite3') {
  dbconfig.connection.filename = nconf.get('database:file');
} else if (dbtype == 'mysql') {
  dbconfig.connection.host = nconf.get('database:server');
  dbconfig.connection.port = nconf.get('database:port');
  dbconfig.connection.user = nconf.get('database:username');
  dbconfig.connection.password = nconf.get('database:password');
  dbconfig.connection.database = nconf.get('database:database');
} else if (dbtype == 'oracledb') {
  dbconfig.connection.connectString = nconf.get('database:connectString');
  dbconfig.connection.user = nconf.get('database:username');
  dbconfig.connection.password = nconf.get('database:password');
  dbconfig.fetchAsString = ['clob'];
}

//this is required because of the silly way knex migrations handle environments 
module.exports = Object.assign({}, dbconfig, {
  test: dbconfig,
  development: dbconfig,
  staging: dbconfig,
  production: dbconfig,
});
