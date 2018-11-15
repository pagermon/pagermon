var sqlite3 = require('sqlite3').verbose();

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
                sql += "push INTEGER DEFAULT 0, ";
                sql += "pushpri TEXT, ";
                sql += "pushgroup TEXT, ";
                sql += "pushsound TEXT, ";
                sql += "mailenable INTEGER DEFAULT 0, ";
                sql += "mailto TEXT, ";
                sql += "telegram INTEGER DEFAULT 0, ";
                sql += "telechat TEXT, ";
                sql += "twitter INTEGER DEFAULT 0, ";   
                sql += "twitterhashtag TEXT, ";
                sql += "discord INTEGER DEFAULT 0, ";
                sql += "discwebhook TEXT, ";
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
                                db.serialize(() => {
                                    db.run("ALTER TABLE capcodes ADD push INTEGER DEFAULT 0", function(err){ /* ignore error */ });
                                    db.run("ALTER TABLE capcodes ADD pushpri TEXT", function(err){ /* ignore error */ });
                                    db.run("ALTER TABLE capcodes ADD pushgroup TEXT", function(err){ /* ignore error */ });
                                    db.run("ALTER TABLE capcodes ADD pushsound TEXT", function(err){ /* ignore error */ });
                                    db.run("ALTER TABLE capcodes ADD mailenable INTEGER DEFAULT 0", function(err){ /* ignore error */ });
                                    db.run("ALTER TABLE capcodes ADD telegram INTEGER DEFAULT 0", function(err){ /* ignore error */ });
                                    db.run("ALTER TABLE capcodes ADD telechat TEXT", function(err){ /* ignore error */ });
                                    db.run("ALTER TABLE capcodes ADD ignore INTEGER DEFAULT 0", function (err) { /* ignore error */ });
                                    db.run("ALTER TABLE capcodes ADD twitter INTEGER DEFAULT 0", function (err) { /* ignore error */ });
                                    db.run("ALTER TABLE capcodes ADD twitterhashtag TEXT", function (err) { /* ignore error */ });
                                    db.run("ALTER TABLE capcodes ADD discord INTEGER DEFAULT 0", function (err) { /* ignore error */ });
                                    db.run("ALTER TABLE capcodes ADD discwebhook TEXT", function (err) { /* ignore error */ });
                                    db.run("PRAGMA user_version = "+release, function(err){ /* ignore error */ });
                                });
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