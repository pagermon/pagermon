const bcrypt = require('bcryptjs');
var db = require('../knex/knex.js');
var logger = require('../log');

function comparePass(userPassword, databasePassword) {
    return bcrypt.compareSync(userPassword, databasePassword);
}

function createUser(req) {
    const salt = bcrypt.genSaltSync();
    const hash = bcrypt.hashSync(req.body.password, salt);
    
    return db('users')
        .insert({
            username: req.body.username,
            password: hash,
            givenname: req.body.givenname,
            surname: req.body.surname,
            email: req.body.email,
            role: req.body.role,
            status: req.body.status,
            lastlogondate: Date.now()
        })
        .returning('*');
}

module.exports = {
    comparePass,
    createUser
};