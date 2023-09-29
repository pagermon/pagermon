var nconf = require('nconf');
var confFile = './config/config.json';
var dbtype = nconf.get('database:type');

exports.up = function(db) {
  if (dbtype == 'oracledb') {
    return db.schema.raw(`CREATE INDEX search_idx ON "messages"("message")
    INDEXTYPE IS CTXSYS.CONTEXT PARAMETERS
    ('FILTER CTXSYS.NULL_FILTER')`)
  } else {
    return new Promise ((resolve, rejects) => {
      resolve('Not Required')
   })
  }
}

exports.down = function(db) {
  
};




