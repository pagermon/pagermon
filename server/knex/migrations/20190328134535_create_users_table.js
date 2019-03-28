exports.up = function(db, Promise) {
  return db.schema.createTable('users', (table) => {
    table.increments();
    table.string('username').unique().notNullable();
    table.string('password').notNullable();
    table.string('firstName').notNullable();
    table.string('lastName').notNullable();
    table.string('apiKeys').nullable();
    table.string('pustKeys').nullable();
    table.integer('admin').notNullable().defaultTo(0);
    table.timestamp('created_at').nullable().defaultTo('');
  });
}

exports.down = function(db, Promise) {
  return db.schema.dropTable('users');
};
