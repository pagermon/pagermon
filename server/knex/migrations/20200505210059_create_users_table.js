var bcrypt = require('bcryptjs');

exports.up = function(db, Promise) {
    return db.schema.hasTable('users').then(function(exists) {
        if (!exists) {
            return db.schema.createTable('users', table => {
                table.charset('utf8');
                table.collate('utf8_general_ci');
                table.increments('id').primary().unique().notNullable();
                table.string('givenname', [255]).notNullable();
                table.string('surname',[255])
                table.text('username').notNullable().unique();
                table.string('password').notNullable()
                table.string('email').notNullable().unique();
                table.enu('role', ['admin', 'user']).notNullable().defaultTo('user')
                table.enu('status', ['active', 'disabled']).notNullable().defaultTo('disabled')
                table.datetime('lastlogondate').notNullable();
            })
            .then(function (){
              const salt = bcrypt.genSaltSync();
              const hash = bcrypt.hashSync('changeme', salt);
              return db('users')
                     .insert({
                       givenname: 'Admin',
                       surname: '',
                       username: 'admin',
                       password: hash,
                       email: 'none@none.com',
                       role: 'admin',
                       status: 'active',
                       lastlogondate: Date.now()
                     })
                     .then (function () {

                     })
            })
        } else {
          return Promise.resolve('Not Required')
        }
      })
};

exports.down = function(db, Promise) {
  
};
