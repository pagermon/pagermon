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
            }
            if (res[0].user_version == 20181118 || res[0].user_version == 0) {
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
