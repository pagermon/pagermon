var nconf = require('nconf');
var conf_file = './config/config.json';

//in order to create migration files, client must be hardcoded to 'sqlite3' otherwise it won't work. 
var dbconfig = {
    client: nconf.get('database:type'),
        connection: {
            filename: nconf.get('database:file'),
            host: nconf.get('database:server'),
            user: nconf.get('database:username'),
            password: nconf.get('database:password'),
            database: nconf.get('database:database')
        },
    useNullAsDefault: true,
    migrations: {
      tableName: 'knex_migrations',
      directory: __dirname + '/knex/migrations'
    }
}
//this is required because of the silly way knex migrations handle environments 
module.exports = Object.assign({}, dbconfig, {
  development: dbconfig,
  staging: dbconfig,
  production: dbconfig,
});
