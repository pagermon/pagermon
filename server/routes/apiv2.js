var express = require('express');
var bodyParser = require('body-parser');
var router = express.Router();
var bcrypt = require('bcryptjs');
var fs = require('fs');
var logger = require('../log');
var util = require('util');
var passport = require('../auth/local');
var db = require('../knex/knex.js');

router.use(bodyParser.json());       // to support JSON-encoded bodies
router.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

router.route('/user')
.get(isAllowed, function(req, res, next) {
	// List all users
	res.status(200).json({message: 'OK'});
})
.post(isAllowed, function(req, res, next) {
	// Create user
	res.status(200).json({message: 'OK'});
});

router.route('/user/:id')
.get(isAllowed, function(req, res, next) {
 	// Get Single User..
 })
.delete(isAllowed, function(req, res, next) {
	// Delete Single User
});


module.exports = router;

function isAllowed(req, res, next) {
        // ## Match users -- Allow admins (TODO: API Keys)
        if(req.url.match(/user/))
                if (req.isAuthenticated() && req.user.admin) return next();

        res.status(401).json({message: 'You must be authenticated.'});
}
