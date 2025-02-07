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
  dbconfig.client = 'mysql2';
  dbconfig.connection.host = nconf.get('database:server');
  dbconfig.connection.port = nconf.get('database:port');
  dbconfig.connection.user = nconf.get('database:username');
  dbconfig.connection.password = nconf.get('database:password');
  dbconfig.connection.database = nconf.get('database:database');
  
  // Support different authentication methods
  const authMethod = nconf.get('database:auth_method') || 'default';
  if (authMethod === 'mysql_native_password') {
    dbconfig.connection.authPlugins = {
      mysql_native_password: () => {
        return require('mysql2/lib/auth_plugins/mysql_native_password');
      }
    };
  } else if (authMethod === 'sha256_password') {
    dbconfig.connection.authPlugins = {
      sha256_password: () => {
        return require('mysql2/lib/auth_plugins/sha256_password');
      }
    };
  } else if (authMethod === 'caching_sha2_password') {
    dbconfig.connection.authPlugins = {
      caching_sha2_password: () => {
        return require('mysql2/lib/auth_plugins/caching_sha2_password');
      }
    };
  }
  
  // Add support for SSL if configured
  if (nconf.get('database:ssl')) {
    dbconfig.connection.ssl = {
      rejectUnauthorized: true
    };
  }

  // Add connection pool configuration for better performance
  dbconfig.pool = {
    min: 2,
    max: 10,
    createTimeoutMillis: 3000,
    acquireTimeoutMillis: 30000,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    createRetryIntervalMillis: 100
  };
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
