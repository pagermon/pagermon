
exports.up = function(db, Promise) {
    db.schema.hasTable('messages').then(function(exists) {
        if (!exists) {
            return db.schema.createTable('messages', table => {
                    table.increments('id').primary().unique();
                    table.string('address', [255]).notNullable();
                    table.text('message').notNullable();
                    table.text('source').notNullable();
                    table.integer('timestamp');
                    table.integer('alias_id');
                    table.foreign('alias_id').references('capcodes.id');
                    table.index(['address', 'id'], 'msg_index');
                    table.index(['id', 'alias_id'], 'msg_alias');
                    table.index(['timestamp', 'alias_id'], 'msg_timestamp');
            })
            .then((result) =>{

            })
            .catch((err) => {
                
            })
        } else {
            return
        }
    })
}


exports.down = function(db, Promise) {
  
};
