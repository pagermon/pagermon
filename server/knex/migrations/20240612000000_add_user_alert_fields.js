exports.up = function (db) {
  const addMobile = db.schema.hasColumn('users', 'mobile').then(function (exists) {
    if (!exists) {
      return db.schema.table('users', function (table) {
        table.string('mobile');
      });
    }
  });

  const addPushover = db.schema.hasColumn('users', 'pushover').then(function (exists) {
    if (!exists) {
      return db.schema.table('users', function (table) {
        table.string('pushover');
      });
    }
  });

  const createUserAliasTable = db.schema.hasTable('user_aliases').then(function (exists) {
    if (!exists) {
      return db.schema.createTable('user_aliases', function (table) {
        table.charset('utf8');
        table.collate('utf8_general_ci');
        table.increments('id').primary().unique().notNullable();
        table.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.integer('alias_id').unsigned().notNullable().references('id').inTable('capcodes').onDelete('CASCADE');
        table.unique(['user_id', 'alias_id']);
      });
    }
  });

  return Promise.all([addMobile, addPushover]).then(function () {
    return createUserAliasTable;
  });
};

exports.down = function (db) {
  return db.schema.hasTable('user_aliases').then(function (exists) {
    if (exists) {
      return db.schema.dropTable('user_aliases');
    }
  }).then(function () {
    return db.schema.hasColumn('users', 'mobile').then(function (exists) {
      if (exists) {
        return db.schema.table('users', function (table) {
          table.dropColumn('mobile');
        });
      }
    });
  }).then(function () {
    return db.schema.hasColumn('users', 'pushover').then(function (exists) {
      if (exists) {
        return db.schema.table('users', function (table) {
          table.dropColumn('pushover');
        });
      }
    });
  });
};
