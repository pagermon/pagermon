
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
              //add function to migrate existing user account. 
            })
        } else {
          return Promise.resolve('Not Required')
        }
      })
};

exports.down = function(db, Promise) {
  
};
