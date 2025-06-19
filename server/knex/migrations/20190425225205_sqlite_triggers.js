var nconf = require('nconf');
var confFile = './config/config.json';
var dbtype = nconf.get('database:type')

exports.up = function(db) {
    if (dbtype == 'sqlite3') {
    return Promise.all([
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
        `),
        db.raw(`
            CREATE TRIGGER IF NOT EXISTS messages_search_index_update AFTER UPDATE ON messages BEGIN
                        UPDATE messages_search_index SET
                            message = new.message,
                            alias = (SELECT alias FROM capcodes WHERE id = new.alias_id),
                            agency = (SELECT agency FROM capcodes WHERE id = new.alias_id)
                        WHERE rowid = old.id;
                        END;
            `),
        db.raw(`
            CREATE TRIGGER IF NOT EXISTS messages_search_index_delete AFTER DELETE ON messages BEGIN
                        DELETE FROM messages_search_index WHERE rowid = old.id;
                        END;
            `),
        db.raw(`
            INSERT INTO messages_search_index (rowid, message, alias, agency)
                        SELECT messages.id, messages.message, capcodes.alias, capcodes.agency 
                        FROM messages LEFT JOIN capcodes ON capcodes.id = messages.alias_id
                        WHERE messages.id NOT IN (SELECT rowid FROM messages_search_index);
            `)
    ])
} else {
     return new Promise ((resolve, rejects) => {
        resolve('Not Required')
     })
    }
};

exports.down = function(db) {
  
};
