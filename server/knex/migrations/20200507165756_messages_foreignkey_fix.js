const nconf = require('nconf');

const dbtype = nconf.get('database:type');
exports.up = async function (db) {
        if (dbtype !== 'mysql') return 'Not required';

        await db.schema.table('messages', function (table) {
                table.dropForeign('alias_id');
                table.renameColumn('alias_id', 'alias_id_temp');
        });

        await db.schema.table('messages', function (table) {
                table.integer('alias_id').unsigned().references('id').inTable('capcodes').onDelete('SET NULL');
        });
        await db.update('messages', {
                alias_id: db.raw('alias_id_temp'),
        });

        return db.schema.table('messages', function (table) {
                table.dropColumn('alias_id_temp');
        });
};

exports.down = function (db) {};
