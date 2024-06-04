var nconf = require('nconf');
var confFile = './config/config.json';
var dbtype = nconf.get('database:type');

exports.up = function(db) {
  if (dbtype == 'oracledb') {
    return db.schema.hasTable('messages').then(function(exists) {
      if (!exists) {
        return db.schema.createTable('messages', table => {
          if (dbtype == 'mysql') {
            table.charset('utf8');
            table.collate('utf8_general_ci');
          }
          table.collate('utf8_general_ci');
          table.increments('id').primary().unique().notNullable();
          table.string('address', [255]).notNullable();
          table.string('message', [1000]).notNullable();
          table.string('source', [255]).notNullable();
          table.integer('timestamp');
          table.integer('alias_id').unsigned().references('id').inTable('capcodes');
          table.index(['address', 'id'], 'msg_index');
          table.index(['id', 'alias_id'], 'msg_alias');
          table.index(['timestamp', 'alias_id'], 'msg_timestamp');
        });
      } else {
        return db.schema.table('messages', table => {
          table.dropColumn('message');
          table.dropColumn('source');
        }).then(function () {
          return db.schema.table('messages', table => {
            table.string('message', [1000]);
            table.string('source', [255]);
          });
        });
      }
    })
  } else {
    return new Promise ((resolve, rejects) => {
      resolve('Not Required')
   })
  }
}

exports.down = function(db) {
  
};




