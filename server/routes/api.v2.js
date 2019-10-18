const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const passport = require('passport');
const _ = require('underscore');
const logger = require('../log');
const db = require('../knex/knex.js');
require('../config/passport')(passport); // pass passport for configuration

const { raw } = require('objection');
const {Alias} = require('../models/Alias');
const {Message} = require('../models/Message');

const nconf = require('nconf');
const conf_file = './config/config.json';
nconf.file({file: conf_file});
nconf.load();


router.use(bodyParser.json());       // to support JSON-encoded bodies
router.use(bodyParser.urlencoded({     // to support URL-encoded bodies
    extended: true
}));

router.use(function (req, res, next) {
    res.locals.login = req.isAuthenticated();
    next();
});


var initData = {};
initData.limit = nconf.get('messages:defaultLimit');
initData.replaceText = nconf.get('messages:replaceText');
initData.currentPage = 0;
initData.pageCount = 0;
initData.msgCount = 0;
initData.offset = 0;


var HideCapcode = nconf.get('messages:HideCapcode');
var apiSecurity = nconf.get('messages:apiSecurity');
var dbtype = nconf.get('database:type');


router.get('/messages', isLoggedIn, async function(req, res, next) {
    nconf.load();
    const pdwMode = nconf.get('messages:pdwMode');
    const adminShow = nconf.get('messages:adminShow');
    const maxLimit = nconf.get('messages:maxLimit');
    const defaultLimit = nconf.get('messages:defaultLimit');

    /*
 * Getting request parameters
 */
    if (typeof req.query.page !== 'undefined') {
        const page = parseInt(req.query.page, 10);
        if (page > 0)
        // This accounts for the fact, that page is indexed starting 1 on the site and 0 in node
            initData.currentPage = page - 1;
    }
    else
    // If no valid page is set, use 0 instead.
        initData.currentPage = 0;

    if (req.query.limit && req.query.limit <= maxLimit)
        initData.limit = parseInt(req.query.limit, 10);
    else
        initData.limit = parseInt(defaultLimit, 10);

    const result = await Message
        .query()
        .eager('alias(messageView)')
        .page(initData.currentPage,initData.limit);

    //TODO: Helloworld
    res.status(200).json({'init': 'Hello', 'messages': result.results});
});


module.exports = router;

function isLoggedIn(req, res, next) {
    if (req.method == 'GET') {
        if (apiSecurity || ((req.url.match(/capcodes/i) || req.url.match(/capcodeCheck/i)) && !(req.url.match(/agency$/))) ) { //check if Secure mode is on, or if the route is a capcode route
            if (req.isAuthenticated()) {
                // if user is authenticated in the session, carry on
                return next();
            } else {
                //logger.main.debug('Basic auth failed, attempting API auth');
                passport.authenticate('localapikey', { session: false, failWithError: true })(req, res, next),
                    function (next) {
                        next();
                    },
                    function (res) {
                        return res.status(401).json({ error: 'Authentication failed.' });
                    }
            }
        } else {
            return next();
        }
    } else if (req.method == 'POST') { //Check if user is authenticated for POST methods
        if (req.isAuthenticated()) {
            return next();
        } else {
            passport.authenticate('localapikey', { session: false, failWithError: true }) (req,res,next),
                function (next) {
                    next();
                },
                function (res) {
                    return res.status(401).json({ error: 'Authentication failed.' });
                }
        }
    }
}
