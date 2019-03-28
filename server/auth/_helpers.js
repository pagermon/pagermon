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

function adminRequired(req, res, next) {
  if (!req.user){
	  res.status(401).json({status: 'Please log in'});
  }
  return db('users').where({username: req.user.username}).first()
  .then((user) => {
    if (!user.admin){
	    req.flash('info', 'You need to be logged in to access this page');
	    res.redirect('/index');
    }
    return next();
  })
  .catch((err) => {
    req.flash('info', 'You need to be logged in to access this page');
    res.redirect('/index');
  });
}

module.exports = {
  comparePass, createUser
};
