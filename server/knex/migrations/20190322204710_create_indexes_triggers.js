var nconf = require('nconf');
var confFile = './config/config.json';
var dbtype = nconf.get('database:type')

exports.up = function(db) {
    if (dbtype == 'sqlite3') {
        return db.raw(`
            CREATE VIRTUAL TABLE IF NOT EXISTS messages_search_index USING fts3(message, alias, agency);
            `)
    } else if (dbtype == 'mysql'){
        return Promise.all([
            db.raw(`
                ALTER TABLE messages ADD FULLTEXT (message, source, address);
            `),
            db.raw(`
                ALTER TABLE capcodes ADD FULLTEXT (alias, agency);
            `)
        ])
    } else {
        return new Promise ((resolve, rejects) => {
            resolve('Not Required')
         })
    }
};

exports.down = function(db) {
    return db.schema.dropTable('messages_search_index');
};
