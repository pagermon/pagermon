
exports.up = function(db, Promise) {
  return db.schema.hasTable('capcodes').then(function(exists) {
    if (!exists) {
     db.schema.createTable('capcodes', table => {
            table.integer('id').primary().notNullable();
            table.string('address', [255]).notNullable();
            table.text('alias').notNullable();
            table.text('agency');
            table.text('icon');
            table.text('color');
            table.text('pluginconf')
            table.integer('ignore').defaultTo(0);
            table.unique(['id', 'address'], 'cc_pk_idx');
      })
    }
  })
}

exports.down = function(db, Promise) {
  
};
