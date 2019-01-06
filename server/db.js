var fs = require('fs');

// initialize the database if it does not already exist
function init(release) {
    var db = require('knex')({
        client: 'sqlite3',
        connection: {
            filename: "./messages.db"
        },
        useNullAsDefault: true,
    });

    var dbtype = db.client.config.client
    
    db.schema.hasTable('capcodes').then(function (exists) {
        if (!exists) {
            db.schema.createTable('capcodes', table => {
                table.increments('id').primary();
                table.text('address').notNullable();
                table.text('alias').notNullable();
                table.text('agency');
                table.text('icon');
                table.text('color');
                table.text('pluginconf');
                table.integer('ignore').defaultTo(0);
                table.unique(['id', 'address'], 'cc_pk_idx');
            }).then(function (result) {
                console.log('Created Table ', result);
            }).catch(function (err) {
                console.error('Error Creating Table ', err);
            });
        }
    });
    db.schema.hasTable('messages').then(function (exists) {
        if (!exists) {
            db.schema.createTable('messages', table => {
                table.integer('id').primary().unique();
                table.text('address').notNullable();
                table.text('message').notNullable();
                table.text('source').notNullable();
                table.integer('timestamp');
                table.integer('alias_id');
                table.foreign('alias_id').references('capcodes.id');
                table.index(['address', 'id'], 'msg_index');
                table.index(['id', 'alias_id'], 'msg_alias');
                table.index(['timestamp', 'alias_id'], 'msg_timestamp');
            }).then(function (result) {
                console.log('Created Table ', result);
            }).catch(function (err) {
                console.error('Error Creating Table ', err);
            });
        }
    });
    if (dbtype == 'sqlite3') {
        db.raw(`CREATE VIRTUAL TABLE IF NOT EXISTS messages_search_index USING fts3(message, alias, agency);`)
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
        db.raw(`
        CREATE TRIGGER IF NOT EXISTS messages_search_index_update AFTER UPDATE ON messages BEGIN
                    UPDATE messages_search_index SET
                        message = new.message,
                        alias = (SELECT alias FROM capcodes WHERE id = new.alias_id),
                        agency = (SELECT agency FROM capcodes WHERE id = new.alias_id)
                    WHERE rowid = old.id;
                    END;
        `)
        db.raw(`
        CREATE TRIGGER IF NOT EXISTS messages_search_index_delete AFTER DELETE ON messages BEGIN
                    DELETE FROM messages_search_index WHERE rowid = old.id;
                    END;
        `)
        db.raw(`
        INSERT INTO messages_search_index (rowid, message, alias, agency)
                    SELECT messages.id, messages.message, capcodes.alias, capcodes.agency 
                    FROM messages LEFT JOIN capcodes ON capcodes.id = messages.alias_id
                    WHERE messages.id NOT IN (SELECT rowid FROM messages_search_index);
        `)
    }
    db.raw(`pragma user_version;`).then(function (res) {
        console.log("Current DB version: " + res[0].user_version);
        console.log("Latest DB version: " + release);
        if (res[0].user_version < release) {
            console.log("DB schema out of date, updating");
            db.schema.table('capcodes', table => {
                table.integer('push');
                table.text('pushpri');
                table.text('pushgroup');
                table.text('pushsound');
                table.integer('mailenable');
                table.text('mailto');
                table.integer('telegram');
                table.text('telechat');
                table.integer('ignore');
                table.integer('twitter');
                table.text('twitterhashtag');
                table.integer('discord');
                table.text('discwebhook');
                table.text('pluginconf');
            });
            db.schema.table('messages', table => {
                table.index(['timestamp', 'alias_id'], 'msg_timestamp');
            });
            var vervar = 'pragma user_version = ' + release + ';'
                db.raw(vervar)
                  .catch(function (err) {
                    console.log(err)
            });
        }
        if (res[0].user_version < '20181118') {
            // begin scary stuff, consider hiding behind a solid object during this bit - not converting this to knex because it should only be a once off thing
            db.raw(`
                PRAGMA foreign_keys=off;
                BEGIN TRANSACTION;
                ALTER TABLE capcodes RENAME TO _capcodes_backup;
                DROP INDEX IF EXISTS cc_pk_idx;
                UPDATE _capcodes_backup SET pluginconf = '{}';
                UPDATE _capcodes_backup SET pluginconf = '{
                    "Discord": {
                        "enable": ' || REPLACE(REPLACE(COALESCE(discord,0),0,'false'),1,'true') || ',
                        "webhook": "' || COALESCE(discwebhook,'') || '"
                    },
                    "Pushover": {
                        "enable": ' || REPLACE(REPLACE(COALESCE(push,0),0,'false'),1,'true') || ',
                        "priority": {"value": "' || COALESCE(pushpri,'') || '"},
                        "group": "' || COALESCE(pushgroup,'') || '",
                        "sound": {"value": "' || COALESCE(pushsound,'') || '"}
                    },
                    "SMTP": {
                        "enable": ' || REPLACE(REPLACE(COALESCE(mailenable,0),0,'false'),1,'true') || ',
                        "mailto": "' || COALESCE(mailto,'') || '"
                    },
                    "Telegram": {
                        "enable": ' || REPLACE(REPLACE(COALESCE(telegram,0),0,'false'),1,'true') || ',
                        "chat": "' || COALESCE(telechat,'') || '"
                    },
                    "Twitter": {
                        "enable": ' || REPLACE(REPLACE(COALESCE(twitter,0),0,'false'),1,'true') || ',
                        "hashtag": "' || COALESCE(twitterhashtag,'') || '"
                    }
                }';

                CREATE TABLE IF NOT EXISTS "capcodes" (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                address TEXT NOT NULL,
                alias TEXT NOT NULL,
                agency TEXT,
                icon TEXT,
                color TEXT,
                ignore INTEGER DEFAULT 0,
                pluginconf TEXT);

                INSERT INTO capcodes (id, address, alias, agency, icon, color, ignore, pluginconf)
                    SELECT id, address, alias, agency, icon, color, ignore, pluginconf
                    FROM _capcodes_backup;

                COMMIT;
                PRAGMA foreign_keys=on;
                CREATE UNIQUE INDEX IF NOT EXISTS cc_pk_idx ON capcodes (id,address DESC);
                `).catch(function (err) {
                    console.error('Failed to convert database ... aborting ' + err)
                });
                var vervar = 'pragma user_version = ' + release + ';'
                db.raw(vervar)
                  .catch(function (err) {
                    console.log(err)
                });
                console.log("DB schema update complete");
                // Switch config file over to plugin format
                console.log("Updating config file");
                var nconf = require('nconf');
                    var conf_file = './config/config.json';
                var conf_backup = './config/backup.json';
                nconf.file({ file: conf_file });
                nconf.load();
                var curConfig = nconf.get();
                fs.writeFileSync(conf_backup, JSON.stringify(curConfig, null, 2));
                if (!curConfig.plugins)
                    curConfig.plugins = {};

                if (curConfig.discord) {
                    curConfig.plugins.Discord = {
                        "enable": curConfig.discord.discenable
                    };
                }
                if (curConfig.pushover) {
                    curConfig.plugins.Pushover = {
                        "enable": curConfig.pushover.pushenable,
                        "pushAPIKEY": curConfig.pushover.pushAPIKEY
                    };
                }
                if (curConfig.STMP) {
                    curConfig.plugins.SMTP = {
                        "enable": curConfig.STMP.MailEnable,
                        "mailFrom": curConfig.STMP.MailFrom,
                        "mailFromName": curConfig.STMP.MailFromName,
                        "server": curConfig.STMP.SMTPServer,
                        "port": curConfig.STMP.SMTPPort,
                        "username": curConfig.STMP.STMPUsername,
                        "password": curConfig.STMP.STMPPassword,
                        "secure": curConfig.STMP.STMPSecure
                    };
                }
                if (curConfig.telegram) {
                    curConfig.plugins.Telegram = {
                        "enable": curConfig.telegram.teleenable,
                        "teleAPIKEY": curConfig.telegram.teleAPIKEY
                    };
                }
                if (curConfig.twitter) {
                    curConfig.plugins.Twitter = {
                        "enable": curConfig.twitter.twitenable,
                        "consKey": curConfig.twitter.twitconskey,
                        "consSecret": curConfig.twitter.twitconssecret,
                        "accToken": curConfig.twitter.twitacctoken,
                        "accSecret": curConfig.twitter.twitaccsecret,
                        "globalHashtags": curConfig.twitter.twitglobalhashtags
                    };
                }
                delete curConfig.discord;
                delete curConfig.pushover;
                delete curConfig.STMP;
                delete curConfig.telegram;
                delete curConfig.twitter;
                fs.writeFileSync(conf_file, JSON.stringify(curConfig, null, 2));
                nconf.load();
                console.log("Config file updated!");
            
        } else {
            console.log("DB schema up to date!");
        }
    }).catch(function (err) {
        console.log('Error getting DB Version')
    });
}

module.exports = {
    init: init
}
