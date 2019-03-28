exports.up = function(db, Promise) {
  return db.schema.createTable('users', (table) => {
    table.increments();
    table.string('username').unique().notNullable();
    table.string('password').notNullable();
    table.string('firstName').notNullable();
    table.string('lastName').notNullable();
    table.string('apiKeys').nullable();
    table.string('pustKeys').nullable();
    table.boolean('admin').notNullable().defaultTo(false);
    table.timestamp('created_at').notNullable().defaultTo(db.raw('now()'));
  });
}

exports.down = function(db, Promise) {
  return db.schema.dropTable('users');
};
