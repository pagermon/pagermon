const nconf = require('nconf');

exports.up = async function (db) {
        const dbtype = nconf.get('database:type');
        if (dbtype !== 'oracledb') return 'Not required';

        return db.schema.raw(`CREATE INDEX search_idx ON "messages"("message")
                INDEXTYPE IS CTXSYS.CONTEXT PARAMETERS
                ('FILTER CTXSYS.NULL_FILTER')`);
};

exports.down = function (db) {
        const dbtype = nconf.get('database:type');
        if (dbtype !== 'oracledb') return 'Not Required';
        return db.schema.raw(`DROP INDEX search_idx`);
};
