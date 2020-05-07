var nconf = require('nconf');
var conf_file = './config/config.json';
var dbtype = nconf.get('database:type')
exports.up = function(db, Promise) {
    if (dbtype == 'mysql') {
    return db.schema.alterTable('messages', function(table) {
        table.integer('alias_id').unsigned().references('id').inTable('capcodes').onDelete('SET NULL').alter();
      })
    } else {
        return Promise.resolve('Not Required')
    }
};

exports.down = function(knex, Promise) {
  
};
