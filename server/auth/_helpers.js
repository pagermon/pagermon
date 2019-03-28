const bcrypt = require('bcryptjs');
const db = require('../knex/knex.js');

function comparePass(userPassword, databasePassword) {
  return bcrypt.compareSync(userPassword, databasePassword);
}

function createUser (req) {
  const salt = bcrypt.genSaltSync();
  const hash = bcrypt.hashSync(req.body.password, salt);
  return db('users')
  .insert({
    username: req.body.username,
    password: hash
  })
  .returning('*');
}

module.exports = {
  comparePass, createUser
};
