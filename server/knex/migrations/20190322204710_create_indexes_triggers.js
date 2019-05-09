var nconf = require('nconf');
var conf_file = './config/config.json';
var dbtype = nconf.get('database:type')

exports.up = function(db, Promise) {
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
        return Promise.resolve('How did you get here?')
    }
};

exports.down = function(db, Promise) {
  
};
