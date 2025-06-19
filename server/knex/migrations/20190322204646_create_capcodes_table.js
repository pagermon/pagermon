var nconf = require('nconf');
var confFile = './config/config.json';
var dbtype = nconf.get('database:type');

exports.up = function(db) {
  return db.schema.hasTable('capcodes').then(function(exists) {
    if (!exists) {
      return db.schema.createTable('capcodes', table => {
            if (dbtype == 'mysql') {
              table.charset('utf8');
              table.collate('utf8_general_ci');
            }
            table.increments('id').primary().unique().notNullable();
            table.string('address', [255]).notNullable();
            table.text('alias').notNullable();
            table.text('agency');
            table.text('icon');
            table.text('color');
            table.text('pluginconf')
            table.integer('ignore').defaultTo(0);
            table.unique(['id', 'address'], 'cc_pk_idx');
      })
   } else {
    return new Promise ((resolve, rejects) => {
      resolve('Not Required')
   })
   }
 })
}

exports.down = function(db) {
  return db.schema.dropTable('capcodes')
};
