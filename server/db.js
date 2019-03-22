var fs = require('fs');
var logger = require('./log');
var nconf = require('nconf');
var conf_file = './config/config.json';
var db = require('./knex/knex.js');
nconf.file({file: conf_file});
nconf.load();

// initialize the database if it does not already exist
function init(release) {
    var dbtype = nconf.get('database:type')
    //This is here for compatibility with old versions. Will set the DB type then exit. 
    if (dbtype == null || dbtype == 'sqlite') {
        nconf.set('database:type', 'sqlite3');
        nconf.set('database:file', './messages.db');
        nconf.save()
        logger.main.error('Error reading database type. Defaulting to SQLITE3. Killing application')
        process.exit(1)
    }
    //legacy compatibility for SQLITE3 i don't like this at all :\
    if (dbtype == 'sqlite3') {
        db.raw(`pragma user_version;`).then(function (res) {
            logger.main.info("Current DB version: " + res[0].user_version);
            if (res[0].user_version < 20181118 && res[0].user_version != 0) {
                logger.main.error("Unsupported Upgrade Version - Upgrade Pagermon Database to v0.2.3 BEFORE upgrading to v0.3.0");
                process.exit(1)
            } else if (res[0].user_version == 20181118) {
                logger.main.info('Manually marking database migrations as complete')
                //This code manually marks migrations complete for existing databases, prevents errors on startup for existing DB's 
                Promise.all([
                db('knex_migrations')
                    .insert({id:1},{name: '20190322204646_create_capcodes_table.js'},{migration_time: moment().unix()})
                    .then((result) => { 
                        logger.main.debug('Marking migration 1 as complete for existing database')
                    })
                    .catch ((err) => {
                        logger.main.error('Error marking migration 1 as complete for existing database')
                    }),
                db('knex_migrations')
                    .insert({id:2},{name: '20190322204706_create_messages_table.js'},{migration_time: moment().unix()})
                    .then((result) => { 
                        logger.main.debug('Marking migration 2 as complete for existing database')
                    })
                    .catch ((err) => {
                        logger.main.error('Error marking migration 2 as complete for existing database')
                    }),
                db('knex_migrations')
                    .insert({id:3},{name: '20190322204710_create_indexes_triggers.js'},{migration_time: moment().unix()})
                    .then((result) => {
                        logger.main.debug('Marking migration 3 as complete for existing database')
                    })
                    .catch ((err) => {
                        logger.main.error('Error marking migration 3 as complete for existing database')
                    })
                ])
                .then ((result) => {
                    var vervar = 'pragma user_version = ' + release + ';'
                    db.raw(vervar)
                })
                .catch ((err) => {
                    logger.main.error('Failed to upgrade database')
                })
            } else {
                logger.main.info('Checking for database upgrades')
                db.migrate.latest()
                .then((result) => {
                    logger.main.info(result)
                })
                .catch((err) => {
                    logger.main.error(err)
                })
            }
        })
    } else {
        db.migrate.latest()
        .then((result) => {
            logger.main.info(result)
        })
        .catch((err) => {
            logger.main.error(err)
        })
    }
}

module.exports = {
    init: init
}
