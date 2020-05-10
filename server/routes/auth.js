const express = require('express');
const router = express.Router();
var logger = require('../log');

const authHelpers = require('../auth/_helpers');
const passport = require('../auth/local');

router.post('/register', (req, res, next) => {
    return authHelpers.createUser(req, res)
        .then((response) => {
            console.log('res:' + response)

            passport.authenticate('login-user', (err, user, info) => {
                console.log('user' + user)
                if (user) { handleResponse(res, 200, 'success'); }
            })(req, res, next);
        })
        .catch((err) => {
            logger.main.error(err)
            handleResponse(res, 500, 'error');
        });
});

router.post('/login', (req, res, next) => {
    passport.authenticate('login-user', (err, user, info) => {
        if (err) { handleResponse(res, 500, 'error'); }
        if (!user) { handleResponse(res, 404, 'username or password error'); }
        if (user) {
            req.logIn(user, function (err) {
                if (err) { handleResponse(res, 500, 'error'); }
                handleResponse(res, 200, 'success');
            });
        }
    })(req, res, next);
});

router.get('/logout', authHelpers.loginRequired, (req, res, next) => {
    req.logout();
    handleResponse(res, 200, 'success');
});

function handleResponse(res, code, statusMsg) {
    res.status(code).json({ status: statusMsg });
}

module.exports = router;