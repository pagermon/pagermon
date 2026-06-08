exports.up = function (db) {
  const addBrowserToast = db.schema.hasColumn('users', 'browser_toast').then(function (exists) {
    if (!exists) {
      return db.schema.table('users', function (table) {
        table.boolean('browser_toast').notNullable().defaultTo(true);
      });
    }
  });

  const addBrowserSound = db.schema.hasColumn('users', 'browser_sound').then(function (exists) {
    if (!exists) {
      return db.schema.table('users', function (table) {
        table.boolean('browser_sound').notNullable().defaultTo(true);
      });
    }
  });

  return Promise.all([addBrowserToast, addBrowserSound]);
};

exports.down = function (db) {
  return db.schema.hasColumn('users', 'browser_toast').then(function (exists) {
    if (exists) {
      return db.schema.table('users', function (table) {
        table.dropColumn('browser_toast');
      });
    }
  }).then(function () {
    return db.schema.hasColumn('users', 'browser_sound').then(function (exists) {
      if (exists) {
        return db.schema.table('users', function (table) {
          table.dropColumn('browser_sound');
        });
      }
    });
  });
};
