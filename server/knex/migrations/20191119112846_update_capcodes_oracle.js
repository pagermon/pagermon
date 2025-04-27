const nconf = require('nconf');

exports.up = async function (db) {
        const dbtype = nconf.get('database:type');
        if (dbtype !== 'oracledb') return 'Not Required';
        await db.schema.table('capcodes', (table) => {
                table.renameColumn('alias', 'old_alias');
                table.renameColumn('agency', 'old_agency');
                table.renameColumn('icon', 'old_icon');
                table.renameColumn('color', 'old_color');
        });

        await db.schema.table('capcodes', (table) => {
                table.string('alias', [1000]);
                table.string('agency', [255]);
                table.string('icon', [255]);
                table.string('color', [255]);
        });

        await db.update('capcodes', {
                alias: db.raw('old_alias'),
                agency: db.raw('old_agency'),
                icon: db.raw('old_icon'),
                color: db.raw('old_color'),
        });

        return db.schema.table('capcodes', (table) => {
                table.dropColumn('old_alias');
                table.dropColumn('old_agency');
                table.dropColumn('old_icon');
                table.dropColumn('old_color');
        });
};

exports.down = function (db) {};
