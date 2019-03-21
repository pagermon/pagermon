var fs = require('fs');
var logger = require('./log');
var nconf = require('nconf');
var conf_file = './config/config.json';
nconf.file({file: conf_file});
nconf.load();

// initialize the database if it does not already exist
function init(release) {
    var dbtype = nconf.get('database:type')
    var dbfile = nconf.get('database:file')
    var dbserver = nconf.get('database:server')
    var dbdb = nconf.get('database:database')
    var dbusername = nconf.get('database:username')
    var dbpassword = nconf.get('database:password')

    //This is here for compatibility with old versions. 
    if (dbtype == null || dbtype == 'sqlite') {
        nconf.set('database:type', 'sqlite3');
        nconf.set('database:file', './messages.db');
        nconf.save()
    }

    var db = require('knex')({
        client: dbtype,
        connection: {
            filename: dbfile,
            host: dbserver,
            user: dbusername,
            password: dbpassword,
            database: dbdb
        },
        useNullAsDefault: true,
        debug: true,
    })

    db.schema.hasTable('capcodes').then(function (exists) {
        if (!exists) {
            db.schema.createTable('capcodes', table => {
                table.integer('id').primary().notNullable();
                table.string('address', [255]).notNullable();
                table.text('alias').notNullable();
                table.text('agency');
                table.text('icon');
                table.text('color');
                table.text('pluginconf')
                table.integer('ignore').defaultTo(0);
                table.unique(['id', 'address'], 'cc_pk_idx');
            }).then(function (result) {
                logger.main.info('Created Table ', result[0]);
                db.schema.hasTable('messages').then(function (exists) {
                    if (!exists) {
                        db.schema.createTable('messages', table => {
                            table.increments('id').primary().unique();
                            table.string('address', [255]).notNullable();
                            table.text('message').notNullable();
                            table.text('source').notNullable();
                            table.integer('timestamp');
                            table.integer('alias_id');
                            table.foreign('alias_id').references('capcodes.id');
                            table.index(['address', 'id'], 'msg_index');
                            table.index(['id', 'alias_id'], 'msg_alias');
                            table.index(['timestamp', 'alias_id'], 'msg_timestamp');
                        }).then(function (result) {
                            logger.main.info('Created Table '+ result[0]);
                            if (dbtype == 'sqlite3') {
                                db.raw('CREATE VIRTUAL TABLE IF NOT EXISTS messages_search_index USING fts3(message, alias, agency);')
                                    .then((result) => {

                                    })
                                    .catch((err) => {

                                    })
                                db.raw(`
                                        CREATE TRIGGER IF NOT EXISTS messages_search_index_insert AFTER INSERT ON messages BEGIN
                                        INSERT INTO messages_search_index(
                                                rowid,
                                                message,
                                                alias,
                                                agency
                                            )
                                                    VALUES(
                                                new.id,
                                                new.message,
                                                (SELECT alias FROM capcodes WHERE id = new.alias_id),
                                            (SELECT agency FROM capcodes WHERE id = new.alias_id)
                                                    );
                                        END;
                                        `)
                                    .then((result) => {

                                    })
                                    .catch((err) => {

                                    })
                                db.raw(`
                                        CREATE TRIGGER IF NOT EXISTS messages_search_index_update AFTER UPDATE ON messages BEGIN
                                                    UPDATE messages_search_index SET
                                                        message = new.message,
                                                        alias = (SELECT alias FROM capcodes WHERE id = new.alias_id),
                                                        agency = (SELECT agency FROM capcodes WHERE id = new.alias_id)
                                                    WHERE rowid = old.id;
                                                    END;
                                        `)
                                    .then((result) => {

                                    })
                                    .catch((err) => {

                                    })
                                db.raw(`
                                        CREATE TRIGGER IF NOT EXISTS messages_search_index_delete AFTER DELETE ON messages BEGIN
                                                    DELETE FROM messages_search_index WHERE rowid = old.id;
                                                    END;
                                        `)
                                    .then((result) => {

                                    })
                                    .catch((err) => {

                                    })
                                db.raw(`
                                        INSERT INTO messages_search_index (rowid, message, alias, agency)
                                                    SELECT messages.id, messages.message, capcodes.alias, capcodes.agency 
                                                    FROM messages LEFT JOIN capcodes ON capcodes.id = messages.alias_id
                                                    WHERE messages.id NOT IN (SELECT rowid FROM messages_search_index);
                                        `)
                                    .then((result) => {
                                    
                                    })
                                    .catch((err) => {

                                    })
                            }
                            if (dbtype == 'mysql' || dbtype == 'mariadb') {
                                db.raw(`
                                        CREATE TRIGGER capcodes_insert_id 
                                        BEFORE INSERT 
                                        ON capcodes 
                                        FOR EACH ROW BEGIN
                                            SET NEW.id = (SELECT MAX(id) + 1 FROM capcodes);
                                            IF ( NEW.id IS NULL ) THEN SET NEW.id = 1;
                                            END IF;
                                        END;
                                        `)
                                    .then((result) => {
                                        logger.main.info(result[0])
                                    })
                                    .catch((err) => {
                                        logger.main.error(err)
                                    })
                                db.raw(`
                                        ALTER TABLE messages ADD FULLTEXT (message, source, address);
                                        `)
                                    .then((result) => {
                                        logger.main.info(result[0])
                                    })
                                    .catch((err) => {
                                        logger.main.error(err)
                                    })
                                db.raw(`
                                        ALTER TABLE capcodes ADD FULLTEXT (alias, agency);
                                        `)
                                    .then((result) => {
                                        logger.main.info(result[0])
                                    })
                                    .catch((err) => {
                                        logger.main.error(err)
                                    })
                            }
                        }).catch(function (err) {
                            logger.main.error('Error Creating Table ', err);
                        });
                    }
                });
                if (dbtype == 'sqlite3') {
                    var vervar = 'pragma user_version = ' + release + ';'
                    db.raw(vervar)
                }
            }).catch(function (err) {
                    logger.main.error(err)
            });
        }
        db.raw(`pragma user_version;`).then(function (res) {
            logger.main.info("Current DB version: " + res[0].user_version);
            if (res[0].user_version < 20181118) {
                logger.main.error("Unsupported Upgrade Version - Upgrade Pagermon Database to v0.2.3 BEFORE upgrading to v0.3.0");
                process.exit(1)
            }
        }).catch(function (err) {
            logger.main.error('Error Connecting to Database')
        });
    }).catch(function (err) {
        logger.main.error('Error Connecting to Database ', err);
    })
}


module.exports = {
    init: init
}
