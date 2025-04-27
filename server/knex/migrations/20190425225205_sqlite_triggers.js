const nconf = require('nconf');

exports.up = async function (db) {
        const dbtype = nconf.get('database:type');
        if (dbtype !== 'sqlite3') return 'Not required';
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
            `),
        ]);
};

exports.down = function (db) {
        const dbtype = nconf.get('database:type');
        if (dbtype !== 'sqlite3') return 'Not required';
        return Promise.all([
                db.raw('DROP TRIGGER IF EXISTS messages_search_index_insert'),
                db.raw('DROP TRIGGER IF EXISTS messages_search_index_update'),
                db.raw('DROP TRIGGER IF EXISTS messages_search_index_delete'),
        ]);
};
