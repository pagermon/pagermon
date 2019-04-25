var fs = require('fs');
var logger = require('./log');
var moment = require('moment');
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
    if (dbtype == 'sqlite3') {
        db.raw(`pragma user_version;`).then(function (res) {
            logger.main.info("Current DB version: " + res[0].user_version);
            // Check if database is currently v0.2.3 if not force upgrade to that first
            //Begin legacy support - at some point in the future a breaking change can be put in to remove this code
            if (res[0].user_version < 20181118 && res[0].user_version != 0) {
                logger.main.error("Unsupported Upgrade Version - Upgrade Pagermon Database to v0.2.3 BEFORE upgrading to v0.3.0");
                process.exit(1)
            } else {
                //End Legacy Support
                logger.main.info('Checking for database upgrades')
                db.migrate.latest()
                .then((result) => {
                    var vervar = 'pragma user_version = ' + release + ';'
                    db.raw(vervar)
                    .then((result) => {
                        //logger.main.info('Setting DB to version: ' + release)
                    })
                    .catch((err) => {
                        logger.main.error('Error setting DB Version' + err)
                    })
                })
                .catch((err) => {
                    logger.main.error(err)
                })
            }
        })
    } else {
        db.migrate.latest()
        .then((result) => {
        })
        .catch((err) => {
            logger.main.error(err)
        })
    }
}

module.exports = {
    init: init
}
