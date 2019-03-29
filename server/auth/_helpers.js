const bcrypt = require('bcryptjs');
const db = require('../knex/knex.js');
db.on( 'query', function( queryData ) {
    console.log( queryData );
});

function comparePass(userPassword, databasePassword) {
  return bcrypt.compareSync(userPassword, databasePassword);
}

function usernameExists(req, res){
	var userExists = false;
	db.table('users').where({username: req.body.username}).pluck('id').then(function(ids) { userExists = true; });
	return userExists;
}

function createUser (req) {
  const salt = bcrypt.genSaltSync();
  const hash = bcrypt.hashSync(req.body.password, salt);
  // TODO: confirm username not taken before register
  return db('users')
  .insert({
    username: req.body.username,
    password: hash,
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    admin: false
  })
  .returning('*');
}

function isAdmin(req, res, next) {
  if (!req.user) return false;
  return db('users').where({username: req.user.username}).first()
  .then((user) => {
    if (!user.admin) return false;
    return true;
  })
  .catch((err) => {
    return false;
  });
    return false;
}

module.exports = {
	comparePass,
	createUser,
	usernameExists,
	isAdmin
};
