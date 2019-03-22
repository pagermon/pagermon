var nconf = require('nconf');
var conf_file = './config/config.json';
var dbtype = nconf.get('database:type')

exports.up = function(db, Promise) {
    if (dbtype == 'sqlite3') {
        return Promise.all([
            db.raw('CREATE VIRTUAL TABLE IF NOT EXISTS messages_search_index USING fts3(message, alias, agency);')
                .then((result) => {
                })
                .catch((err) => {

                }),
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

                }),
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

                }),
            db.raw(`
                CREATE TRIGGER IF NOT EXISTS messages_search_index_delete AFTER DELETE ON messages BEGIN
                            DELETE FROM messages_search_index WHERE rowid = old.id;
                            END;
                `)
                .then((result) => {
                })
                .catch((err) => {

                }),
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
        ])
    } else if (dbtype == 'mysql' || dbtype == 'mariadb'){
        return Promise.all([
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

            })
            .catch((err) => {

            }),
            db.raw(`
                ALTER TABLE messages ADD FULLTEXT (message, source, address);
            `)
            .then((result) => {

            })
            .catch((err) => {

            }),
            db.raw(`
                ALTER TABLE capcodes ADD FULLTEXT (alias, agency);
            `)
            .then((result) => {

            })
            .catch((err) => {

            })
        ])
    } else return
};

exports.down = function(db, Promise) {
  
};
