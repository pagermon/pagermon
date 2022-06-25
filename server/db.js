// initialize the database if it does not already exist
function init({ config, logger, db }) {
        const dbtype = config.get('database:type');
        // TODO: extract to migrations tool. This is here for compatibility with old versions. Will set the DB type then exit.
        if (dbtype == null || dbtype === 'sqlite') {
                config.set('database:type', 'sqlite3');
                config.set('database:file', './messages.db');
                config.save();
                logger.main.error('Error reading database type. Defaulting to SQLITE3. Killing application');
                process.exit(1);
        }
        if (dbtype === 'sqlite3') {
                // Legacy Datbase handling - force an upgrade and or remove the old version numbers
                db.raw(`pragma user_version;`).then(function(res) {
                        // Check if database is currently v0.2.3 if not force upgrade to that first
                        if (res[0].user_version < 20181118 && res[0].user_version !== 0) {
                                logger.main.info(`Current Legacy DB version: ${res[0].user_version}`);
                                logger.main.error(
                                        'Unsupported Upgrade Version - Upgrade Pagermon Database to v0.2.3 BEFORE upgrading to v0.3.0'
                                );
                                process.exit(1);
                        } else if (res[0].user_version >= 20181118) {
                                // If the database has a legacy version number from 0.3.0 - remove it
                                logger.main.info(`Current Legacy DB version: ${res[0].user_version}`);
                                const vervar = 'pragma user_version = 0;';
                                db.raw(vervar)
                                        .then(() => {
                                                logger.main.debug('Removing legacy DB version infomation');
                                        })
                                        .catch(err => {
                                                logger.main.error(
                                                        `Error removing legacy DB version infomation ${err.message}`
                                                );
                                        });
                        }
                });
        }
        if (process.env.NODE_ENV !== 'test') {
                db.migrate
                        .currentVersion()
                        .then(result => {
                                logger.main.info(`Current DB version: ${result}`);
                                logger.main.info('Checking for database upgrades');
                                db.migrate
                                        .latest()
                                        .then(innerResult => {
                                                if (innerResult[0] === 1) {
                                                        logger.main.info('Database upgrades complete');
                                                } else if (innerResult[0] === 2) {
                                                        logger.main.info('Database upgrade not required');
                                                }
                                        })
                                        .catch(err => {
                                                logger.main.error(`Error upgrading database: ${err.message}`);
                                        });
                        })
                        .catch(err => {
                                logger.main.error(`Error retrieving database version ${err}`);
                        });
        }
}

module.exports = {
        init,
};
