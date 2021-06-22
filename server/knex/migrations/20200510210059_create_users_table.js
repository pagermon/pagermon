var bcrypt = require('bcryptjs');
var nconf = require('nconf');

var confFile = './config/config.json';
nconf.file({ file: confFile });

var user = nconf.get('auth:user')
var pwd = nconf.get('auth:encPass')

exports.up = function(db, Promise) {
    return db.schema.hasTable('users').then(function(exists) {
        if (!exists) {
            return db.schema.createTable('users', table => {
                table.charset('utf8');
                table.collate('utf8_general_ci');
                table.increments('id').primary().unique().notNullable();
                table.string('givenname', [255]).notNullable();
                table.string('surname',[255])
                table.string('username',[32]).notNullable().unique();
                table.string('password').notNullable()
                table.string('email').notNullable().unique();
                table.enu('role', ['admin', 'user']).notNullable().defaultTo('user')
                table.enu('status', ['active', 'disabled']).notNullable().defaultTo('disabled')
                table.datetime('lastlogondate')
            })
            .then(function (){
              //Migrate the current admin user. 
              return db('users')
                     .insert({
                       givenname: 'Admin',
                       surname: '',
                       username: user,
                       password: pwd,
                       email: 'none@none.com',
                       role: 'admin',
                       status: 'active',
                       lastlogondate: null
                     })
                     .then (function () {

                     });
            });
        } else {
          return Promise.resolve('Not Required')
        }
      })
};

exports.down = function(db, Promise) {
  return db.schema.dropTable('users');
};
