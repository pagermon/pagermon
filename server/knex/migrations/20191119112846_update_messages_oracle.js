const nconf = require('nconf');

exports.up = async function (db) {
        const dbtype = nconf.get('database:type');
        if (dbtype !== 'oracledb') return 'Not required';

        await db.schema.table('messages', (table) => {
                table.renameColumn('message', 'message_old');
                table.renameColumn('source', 'source_old');
        });

        await db.schema.table('messages', (table) => {
                table.string('message', [1000]);
                table.string('source', [255]);
        });

        await db('messages').update({
                message: db.raw('message_old'),
                source: db.raw('source_old'),
        });

        return db.schema.table('messages', (table) => {
                table.dropColumn('message_old');
                table.dropColumn('source_old');
        });
};

exports.down = function (db) {};
