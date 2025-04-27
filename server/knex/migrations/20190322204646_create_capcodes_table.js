const nconf = require('nconf');

exports.up = async function (db) {
        const dbtype = nconf.get('database:type');
        await db.schema.createTable('capcodes', (table) => {
                if (dbtype === 'mysql') {
                        table.charset('utf8');
                        table.collate('utf8_general_ci');
                }
                table.increments('id').primary().unique().notNullable();
                table.string('address', [255]).notNullable();
                table.text('alias').notNullable();
                table.text('agency');
                table.text('icon');
                table.text('color');
                table.text('pluginconf');
                table.integer('ignore').defaultTo(0);
                table.unique(['id', 'address'], 'cc_pk_idx');
        });
};

exports.down = function (db) {
        return db.schema.dropTableIfExists('capcodes');
};
