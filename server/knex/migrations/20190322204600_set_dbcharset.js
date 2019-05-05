var nconf = require('nconf');
var conf_file = './config/config.json';
var dbtype = nconf.get('database:type')

exports.up = function(db, Promise) {
    if (dbtype == 'mysql') {
        return Promise.all([
            db.raw(`
                ALTER DATABASE CHARACTER SET utf8 COLLATE utf8_general_ci;
            `)
        ])
    } else {
        return Promise.resolve('Wrong DB Type Not Required')
    } 
  }
  
  exports.down = function(db, Promise) {
   
  };
  