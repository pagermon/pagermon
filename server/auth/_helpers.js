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

function isAdmin(req, res, next) {
    if (!req.user) return false;
    return db('users').where({
        username: req.user.username
    })
        .first()
        .then((user) => {
            if (!user.role === 'admin') {
                return false;
            } else {
                return true;
            }
        })
        .catch((err) => {
            return false;
        });
    return false;
}


module.exports = {
    comparePass,
    createUser,
    isAdmin
};