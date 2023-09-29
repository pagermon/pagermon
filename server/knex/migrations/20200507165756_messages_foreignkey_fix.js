var nconf = require('nconf');
var confFile = './config/config.json';
var dbtype = nconf.get('database:type')
exports.up = function (db) {
    if (dbtype == 'mysql') {
        return db.schema.table('messages', function (table) {
            table.dropForeign('alias_id')
        })
            .then(function () {
                return db.schema.table('messages', function (table) {
                    table.dropColumn('alias_id')
                })
                    .then(function () {
                        return db.schema.table('messages', function (table) {
                            table.integer('alias_id').unsigned().references('id').inTable('capcodes').onDelete('SET NULL'); 
                        })
                        .then(function () {
                            nconf.set('database:aliasRefreshRequired', 1);
                            nconf.save();
                            return Promise.resolve()
                        })
                    })
        })
    } else {
        return new Promise ((resolve, rejects) => {
            resolve('Not Required')
         })
    }
};

exports.down = function (db) {

};
