const bcrypt = require('bcryptjs');
const db = require('../knex/knex.js');
db.on( 'query', function( queryData ) {
    console.log( queryData );
});

function comparePass(userPassword, databasePassword) {
  return bcrypt.compareSync(userPassword, databasePassword);
}

function createUser (req) {
  const salt = bcrypt.genSaltSync();
  const hash = bcrypt.hashSync(req.body.password, salt);
  return db('users')
  .insert({
    username: req.body.username,
    password: hash,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    admin: 0
  })
  .returning('*');
}

module.exports = {
  comparePass, createUser
};
