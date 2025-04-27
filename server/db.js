const logger = require('./log');
const nconf = require('nconf');

const db = require('./knex/knex.js');

// initialize the database if it does not already exist
async function init() {
        const dbtype = nconf.get('database:type');
        // This is here for compatibility with old versions. Will set the DB type then exit.
        if (dbtype == null || dbtype === 'sqlite') {
                nconf.set('database:type', 'sqlite3');
                nconf.set('database:file', './messages.db');
                nconf.save();
                logger.main.error('Error reading database type. Defaulting to SQLITE3. Killing application');
                process.exit(1);
        }
        if (dbtype === 'sqlite3') {
                // Legacy Datbase handling - force an upgrade and or remove the old version numbers
                const userVersion = (await db.raw(`pragma user_version;`))[0].user_version;

                // Check if database is currently v0.2.3 if not force upgrade to that first
                if (userVersion < 20181118 && userVersion !== 0) {
                        logger.main.info(`Current Legacy DB version: ${userVersion}`);
                        logger.main.error(
                                'Unsupported Upgrade Version - Upgrade Pagermon Database to v0.2.3 BEFORE upgrading to v0.3.0'
                        );
                        return process.exit(1);
                }
                if (userVersion >= 20181118) {
                        // If the database has a legacy version number from 0.3.0 - remove it
                        logger.main.info(`Current Legacy DB version: ${userVersion}`);

                        try {
                                await db.raw('pragma user_version = 0;');
                                logger.main.debug('Removed legacy DB version infomation');
                        } catch (error) {
                                logger.main.error(`Error removing legacy DB version infomation: ${error}`);
                        }
                }
        }
        if (process.env.NODE_ENV !== 'test') {
                try {
                        const dbVersion = await db.migrate.currentVersion();
                        logger.main.info(`Current DB version: ${dbVersion}`);
                        logger.main.info('Checking for database upgrades');

                        const migration = await db.migrate.latest();
                        if (migration === 1) {
                                logger.main.info('Database upgrades complete');
                        } else if (migration === 2) {
                                logger.main.info('Database upgrade not required');
                        }
                } catch (error) {
                        logger.main.error(`Error retrieving or upgrading the database version: ${error}`);
                }
        }
}

module.exports = {
        init,
};
