
exports.up = function(db, Promise) {
    return db.schema.table('capcodes', function(table) {
        table.integer('storeToneOnly').defaultTo(0);
        table.integer('processToneOnly').defaultTo(0);
    });
};

exports.down = function(db, Promise) {
    return db.schema.table('capcodes', function(table) {
        table.dropColumn('storeToneOnly');
        table.dropColumn('processToneOnly');
    });
};
