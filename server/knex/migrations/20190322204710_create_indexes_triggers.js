const nconf = require('nconf');

exports.up = async function (db) {
        const dbtype = nconf.get('database:type');
        switch (dbtype) {
                case 'sqlite3':
                        return db.schema.raw(`
                CREATE VIRTUAL TABLE IF NOT EXISTS messages_search_index USING fts3(message, alias, agency);
            `);
                case 'mysql':
                        return Promise.all([
                                db.schema.raw(`
                    ALTER TABLE messages ADD FULLTEXT (message, source, address);
                `),
                                db.schema.raw(`
                    ALTER TABLE capcodes ADD FULLTEXT (alias, agency);
                `),
                        ]);
                default:
                        return 'Not required';
        }
};

exports.down = async function (db) {
        const dbtype = nconf.get('database:type');
        if (dbtype === 'sqlite3') return db.schema.dropTableIfExists('messages_search_index');
        return 'Not required';
};
