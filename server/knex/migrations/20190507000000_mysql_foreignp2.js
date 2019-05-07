var nconf = require('nconf');
var conf_file = './config/config.json';
var dbtype = nconf.get('database:type')

exports.up = function(db, Promise) {
 if (dbtype == 'mysql'){
        return Promise.all([
            // This is here to fix original broken mysql installs - probably not required going forward.
            db.schema.table('messages', function (table) {
                table.integer('alias_id').unsigned().references('id').inTable('capcodes').onUpdate('CASCADE').onDelete('CASCADE');
             })
            //end broken MySQL Fix
        ])
    } else {
        return Promise.resolve('Not Required')
    }
};

exports.down = function(db, Promise) {
  
};


