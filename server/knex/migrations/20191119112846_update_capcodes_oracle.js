var nconf = require('nconf');
var conf_file = './config/config.json';
var dbtype = nconf.get('database:type');

exports.up = function(db, Promise) {
  if (dbtype == 'oracledb') {
    return db.schema.hasTable('capcodes').then(function(exists) {
      if (!exists) {
        return db.schema.createTable('capcodes', table => {
          table.charset('utf8');
          table.collate('utf8_general_ci');
          table.increments('id').primary().unique().notNullable();
          table.string('address', [255]).notNullable();
          table.string('alias', [1000]).notNullable();
          table.string('agency', [255]);
          table.string('icon', [255]);
          table.string('color', [255]);
          table.text('pluginconf');
          table.integer('ignore').defaultTo(0);
          table.unique(['id', 'address'], 'cc_pk_idx');
        });
      } else {
        return db.schema.table('capcodes', table => {
          table.dropColumn('alias');
          table.dropColumn('agency');
          table.dropColumn('icon');
          table.dropColumn('color');
          table.string('alias', [1000]);
          table.string('agency', [255]);
          table.string('icon', [255]);
          table.string('color', [255]);
        });
      }
    })
  } else {
    return Promise.resolve('Not Required')
  }
}

exports.down = function(db, Promise) {
  
};




