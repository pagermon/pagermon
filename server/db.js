var sqlite3 = require('sqlite3').verbose();
var fs = require('fs');

// initialize the database if it does not already exist
function init(release) {
    var db = new sqlite3.Database('./messages.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, function (err) {
        if (err) { console.log(err.message); } else {
            // initialise capcodes table
            var sql =  "CREATE TABLE IF NOT EXISTS capcodes ( ";
                sql += "id INTEGER PRIMARY KEY AUTOINCREMENT, ";
                sql += "address TEXT NOT NULL, ";
                sql += "alias TEXT NOT NULL, ";
                sql += "agency TEXT, ";
                sql += "icon TEXT, ";
                sql += "color TEXT, ";
                sql += "pluginconf TEXT, ";
                sql += "ignore INTEGER DEFAULT 0 ); ";
                // initialise messages table
                sql += "CREATE TABLE IF NOT EXISTS messages ( ";
                sql += "id INTEGER UNIQUE, ";
                sql += "address TEXT NOT NULL, ";
                sql += "message TEXT NOT NULL, ";
                sql += "source TEXT NOT NULL, ";
                sql += "timestamp INTEGER, ";
                sql += "alias_id INTEGER, ";
                sql += "PRIMARY KEY(`id`), FOREIGN KEY(`alias_id`) REFERENCES capcodes(id) ); ";
                // create indexes and the fts table
                sql += "CREATE INDEX IF NOT EXISTS `msg_index` ON `messages` (`address`,`id` DESC); ";
                sql += "CREATE INDEX IF NOT EXISTS `msg_alias` ON `messages` (`id` DESC, `alias_id`); ";
                sql += "CREATE UNIQUE INDEX IF NOT EXISTS `cc_pk_idx` ON `capcodes` (`id`,`address` DESC); ";
                sql += "CREATE VIRTUAL TABLE IF NOT EXISTS messages_search_index USING fts3(message, alias, agency); ";
                // Create triggers to update the search table on insert/update/delete
                sql += `CREATE TRIGGER IF NOT EXISTS messages_search_index_insert AFTER INSERT ON messages BEGIN
                    INSERT INTO messages_search_index (
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
                    END;`;
                sql += `CREATE TRIGGER IF NOT EXISTS messages_search_index_update AFTER UPDATE ON messages BEGIN
                    UPDATE messages_search_index SET
                        message = new.message,
                        alias = (SELECT alias FROM capcodes WHERE id = new.alias_id),
                        agency = (SELECT agency FROM capcodes WHERE id = new.alias_id)
                    WHERE rowid = old.id;
                    END;`;
                sql += `CREATE TRIGGER IF NOT EXISTS messages_search_index_delete AFTER DELETE ON messages BEGIN
                    DELETE FROM messages_search_index WHERE rowid = old.id;
                    END;`;
                // Populate the search index if not already populated
                sql += `INSERT INTO messages_search_index (rowid, message, alias, agency)
                    SELECT messages.id, messages.message, capcodes.alias, capcodes.agency 
                    FROM messages LEFT JOIN capcodes ON capcodes.id = messages.alias_id
                    WHERE messages.id NOT IN (SELECT rowid FROM messages_search_index);`;

            db.serialize(() => {
                db.exec(sql, function(err) {
                    if (err) { console.log(err); }
                    // now we want to check pragma user_version - this uses YYYYMMDD format as it is an int
                    db.get("pragma user_version;",function(err,res){
                        if(err) {
                            console.log("Something went wrong getting user_version");
                        } else {
                            console.log("Current DB version: "+res.user_version);
                            console.log("Latest DB version: "+release);
                            if (res.user_version < release) {
                                console.log("DB schema out of date, updating");
                                // we now run alter table commands for every column that has been added since the early versions
                                // this is inefficient, but should only run once per upgrade, and will skip over errors of adding columns that already exist
                                // TODO: revise below logic to be smarter and less bloaty over time
                                if (res.user_version < 20181118) {
                                    // we are updating from a pre-plugin release
                                    db.serialize(() => {
                                        // need to make sure all the old source columns are present before we convert to new format
                                        // probably look at removing this on next release, or making it so it only runs when upgrading from ancient version
                                        db.run("ALTER TABLE capcodes ADD push INTEGER DEFAULT 0", function(err){ /* ignore error */ });
                                        db.run("ALTER TABLE capcodes ADD pushpri TEXT", function(err){ /* ignore error */ });
                                        db.run("ALTER TABLE capcodes ADD pushgroup TEXT", function(err){ /* ignore error */ });
                                        db.run("ALTER TABLE capcodes ADD pushsound TEXT", function(err){ /* ignore error */ });
                                        db.run("ALTER TABLE capcodes ADD mailenable INTEGER DEFAULT 0", function(err){ /* ignore error */ });
                                        db.run("ALTER TABLE capcodes ADD mailto TEXT", function(err){ /* ignore error */ });
                                        db.run("ALTER TABLE capcodes ADD telegram INTEGER DEFAULT 0", function(err){ /* ignore error */ });
                                        db.run("ALTER TABLE capcodes ADD telechat TEXT", function(err){ /* ignore error */ });
                                        db.run("ALTER TABLE capcodes ADD ignore INTEGER DEFAULT 0", function (err) { /* ignore error */ });
                                        db.run("ALTER TABLE capcodes ADD twitter INTEGER DEFAULT 0", function (err) { /* ignore error */ });
                                        db.run("ALTER TABLE capcodes ADD twitterhashtag TEXT", function (err) { /* ignore error */ });
                                        db.run("ALTER TABLE capcodes ADD discord INTEGER DEFAULT 0", function (err) { /* ignore error */ });
                                        db.run("ALTER TABLE capcodes ADD discwebhook TEXT", function (err) { /* ignore error */ });
                                        db.run("ALTER TABLE capcodes ADD pluginconf TEXT", function (err) { /* ignore error */ });
                                        // begin scary stuff, consider hiding behind a solid object during this bit
                                        var upgradeSql = `PRAGMA foreign_keys=off;
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
CREATE UNIQUE INDEX IF NOT EXISTS cc_pk_idx ON capcodes (id,address DESC);`;
                                        db.exec(upgradeSql, function(err) {
                                            if (err) { console.log(err); }
                                            // scary db stuff done, phew
                                            db.run("PRAGMA user_version = "+release, function(err){ /* ignore error */ });
                                            console.log("DB schema update complete");
                                            // Switch config file over to plugin format
                                            console.log("Updating config file");
                                            var nconf = require('nconf');
                                            var conf_file = './config/config.json';
                                            var conf_backup = './config/backup.json';
                                            nconf.file({file: conf_file});
                                            nconf.load();
                                            var curConfig = nconf.get();
                                            fs.writeFileSync( conf_backup, JSON.stringify(curConfig,null, 2) );
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
                                            fs.writeFileSync( conf_file, JSON.stringify(curConfig,null, 2) );
                                            nconf.load();
                                            console.log("Config file updated!");
                                        });
                                    });
                                } else {
                                    // we are updating from after the plugin release
                                    // nothing to do here for now
                                }
                            } else {
                                console.log("DB schema up to date!");
                            }
                        }
                    });
                });
            });
        }
    });
}

module.exports = {
    init: init
}