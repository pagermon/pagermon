const nconf = require('nconf');
const logger = require('./log');

const debug = nconf.get('global:loglevel') === 'debug';

const dbtype = nconf.get('database:type');

// in order to create migration files, client must be hardcoded to 'sqlite3' otherwise it won't work.
const dbconfig = {
        client: dbtype,
        connection: {},
        useNullAsDefault: true,
        debug,
        migrations: {
                tableName: 'knex_migrations',
                directory: `${__dirname}/knex/migrations`,
        },
        seeds: {
                directory: `${__dirname}/knex/seeds`,
        },
        log: {
                warn(message) {
                        logger.db.info(JSON.stringify(message));
                },
                error(message) {
                        logger.db.error(JSON.stringify(message));
                },
                deprecate(message) {
                        logger.db.info(JSON.stringify(message));
                },
                debug(message) {
                        logger.db.debug(JSON.stringify(message));
                },
        },
};
if (process.env.NODE_ENV === 'test') {
        dbconfig.client = 'sqlite3'; // Always use sqlite3 for tests, regardless what is being set in config (for now)
        dbconfig.connection.filename = './test/messages.db';
} else
        switch (dbtype) {
                case 'sqlite3':
                        dbconfig.connection.filename = nconf.get('database:file');
                        break;
                case 'mysql':
                        dbconfig.connection.host = nconf.get('database:server');
                        dbconfig.connection.port = nconf.get('database:port');
                        dbconfig.connection.user = nconf.get('database:username');
                        dbconfig.connection.password = nconf.get('database:password');
                        dbconfig.connection.database = nconf.get('database:database');
                        break;
                case 'oracledb':
                        dbconfig.connection.connectString = nconf.get('database:connectString');
                        dbconfig.connection.user = nconf.get('database:username');
                        dbconfig.connection.password = nconf.get('database:password');
                        dbconfig.fetchAsString = ['clob'];
                        break;
                default:
                        throw new Error(`Unsupported database type: ${dbtype}`);
        }
// TODO: we have mssql and postgres in other parts of the code, but it's not included here.

// this is required because of the silly way knex migrations handle environments
module.exports = Object.assign({}, dbconfig, {
        test: dbconfig,
        development: dbconfig,
        staging: dbconfig,
        production: dbconfig,
});
