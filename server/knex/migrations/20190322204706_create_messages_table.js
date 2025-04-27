const nconf = require('nconf');

exports.up = async function (db) {
        await db.schema.createTable('messages', (table) => {
                const dbtype = nconf.get('database:type');
                if (dbtype === 'mysql') {
                        table.charset('utf8');
                        table.collate('utf8_general_ci');
                }
                table.increments('id').primary().unique().notNullable();
                table.string('address', [255]).notNullable();
                table.text('message').notNullable();
                table.text('source').notNullable();
                table.integer('timestamp');
                table.integer('alias_id').unsigned().references('id').inTable('capcodes');
                table.index(['address', 'id'], 'msg_index');
                table.index(['id', 'alias_id'], 'msg_alias');
                table.index(['timestamp', 'alias_id'], 'msg_timestamp');
        });
};

exports.down = function (db) {
        return db.schema.dropTableIfExists('messages');
};
