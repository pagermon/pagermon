exports.up = function(knex) {
  return knex.schema.table('capcodes', function(table) {
    table.boolean('user_subscribable').notNullable().defaultTo(true);
  });
};

exports.down = function(knex) {
  return knex.schema.table('capcodes', function(table) {
    table.dropColumn('user_subscribable');
  });
};
