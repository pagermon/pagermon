var nconf = require('nconf');
var conf_file = './config/config.json';
var dbtype = nconf.get('database:type');

exports.up = function(db, Promise) {
  if (dbtype == 'oracledb') {
    return db.schema.raw(`CREATE INDEX search_idx ON "messages"("message")
    INDEXTYPE IS CTXSYS.CONTEXT PARAMETERS
    ('FILTER CTXSYS.NULL_FILTER')`)
  } else {
    return Promise.resolve('Not Required')
  }
}

exports.down = function(db, Promise) {
  
};




