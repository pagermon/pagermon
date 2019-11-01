const express = require('express');
const bodyParser = require('body-parser');
const router = express.Router();
const passport = require('passport');
const util = require('util');
const _ = require('underscore');
const pluginHandler = require('../plugins/pluginHandler');
const logger = require('../log');
const db = require('../knex/knex.js');
require('../config/passport')(passport); // pass passport for configuration
const { raw } = require('objection');
const { Alias } = require('../models/Alias');
const { Message } = require('../models/Message');

const nconf = require('nconf');
const conf_file = './config/config.json';
nconf.file({file: conf_file});
nconf.load();

// TODO: Personal experiment!!!
const v2 = require('./api.v2');
router.use('/v2',v2);

router.use(bodyParser.json());       // to support JSON-encoded bodies
router.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

router.use(function (req, res, next) {
  res.locals.login = req.isAuthenticated();
  next();
});

// defaults
const initData = {};
    initData.limit = nconf.get('messages:defaultLimit');
    initData.replaceText = nconf.get('messages:replaceText');
    initData.currentPage = 0;
    initData.pageCount = 0;
    initData.msgCount = 0;
    initData.offset = 0;

// auth variables
const HideCapcode = nconf.get('messages:HideCapcode');
const apiSecurity = nconf.get('messages:apiSecurity');

///////////////////
//               //
// GET messages  //
//               //
///////////////////

/*
 * GET message listing.
 */
router.get('/messages', isLoggedIn, async function(req, res, next) {
    console.time('init');

    /*
     * Getting configuration
     */
    nconf.load();
    const pdwMode = nconf.get('messages:pdwMode');
    const adminShow = nconf.get('messages:adminShow');
    const maxLimit = nconf.get('messages:maxLimit');
    const defaultLimit = nconf.get('messages:defaultLimit');
    initData.replaceText = nconf.get('messages:replaceText');

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

    //Time tracking
    console.timeEnd('init');
    console.time('sql');

    const query = Message.query()
        .page(initData.currentPage, initData.limit)
        .modify(builder => {
            //Select join method and filtering according to pdwMode setting
            if (pdwMode && (!adminShow && !req.isAuthenticated()))
                builder.applyFilter(['messageViewInner']).where({ignore: '0'}).whereNotNull('alias.id');
            else
                builder.applyFilter(['messageViewLeft']).where({ignore: '0'}).orWhereNull('alias.ignore');

            //Hide capcode if hideCapcode enabled and not logged in.
            if (HideCapcode && !req.isAuthenticated)
                builder.omit(Message,['address'])
        });

    let queryResult = await query.catch(err => {logger.main.error(err);});

    //Check if the requested page contains messages. If not, try page 0. If this also has no messages, send empty result
    if (!queryResult || !queryResult.results || queryResult.results.length === 0) {
        initData.currentPage = 0;
        queryResult = await query.page(initData.currentPage, initData.limit).catch(err => {logger.main.error(err);});
        if (queryResult && queryResult.results && queryResult.results.length === 0)
            res.status(200).json({'init': {}, 'messages': []});
    }

    //Calculate initData for the result and correct presentation on clients.
    //initData.msgCount = queryResult.total;
    initData.pageCount = Math.ceil(initData.msgCount / initData.limit);
    initData.offset = initData.limit * initData.currentPage;
    initData.offsetEnd = initData.offset + initData.limit;

    //If everything is fine, send result.
    if (queryResult.results.length > 0) {
        console.timeEnd('sql');
        console.time('send');
        res.status(200).json({'init': initData, 'messages': queryResult.results});
        console.timeEnd('send');
    }
  });

router.get('/messages/:id', isLoggedIn, async function(req, res, next) {
      nconf.load();

      const pdwMode = nconf.get('messages:pdwMode');

      console.time('sql');
      const queryResult = await Message.query()
          .findById(req.params.id)
          .modify('messageViewLeft')
          .modify(builder => {
              if (HideCapcode && !req.isAuthenticated())
                  builder.omit(Message, ['address']);
          });

      console.timeEnd('sql');
      console.time('send');

      if (!queryResult || (queryResult.ignore || (pdwMode && !queryResult.alias)))
          res.status(200).json({});
      else
          res.status(200).json({queryResult});

      queryResult.catch(err => {res.status(500).send(err)});
      console.timeEnd('send');
});

/* GET message search */
router.get('/messageSearch', isLoggedIn, async function(req, res, next) {
    nconf.load();
    console.time('init');
    const dbtype = nconf.get('database:type');
    const pdwMode = nconf.get('messages:pdwMode');
    const hideCapcode = nconf.get('messages:hideCapcode');
    const adminShow = nconf.get('messages:adminShow');
    const maxLimit = nconf.get('messages:maxLimit');
    const defaultLimit = nconf.get('messages:defaultLimit');
    initData.replaceText = nconf.get('messages:replaceText');

    if (typeof req.query.page !== 'undefined') {
    let page = parseInt(req.query.page, 10);
    if (page > 0) {
      initData.currentPage = page - 1;
    } else {
      initData.currentPage = 0;
    }
    }
    if (req.query.limit && req.query.limit <= maxLimit) {
    initData.limit = parseInt(req.query.limit, 10);
    } else {
    initData.limit = parseInt(defaultLimit, 10);
    }

    console.timeEnd('init');
    console.time('sql');

    const queryResult = await Message.query()
        .skipUndefined()
        .where('alias.agency', 'LIKE' ,req.query.agency).andWhere('alias.ignore','0')
        .where('address', 'LIKE' ,req.query.address).orWhere('source','LIKE',req.query.address)
        .modify(
            builder => {
                if (req.query.q) builder.whereRaw('MATCH(message, address, source) AGAINST (? IN BOOLEAN MODE)',[req.query.q])
            }
        )
        .modify(builder => {
            if (pdwMode && !adminShow && !req.isAuthenticated)
                builder.applyFilter(['messageViewInner']);
            else
                builder.applyFilter(['messageViewLeft']);
            if (hideCapcode && !req.isAuthenticated())
                builder.omit(Message, ['address']);
        })
        .page(initData.currentPage, initData.limit);

    console.timeEnd('sql');
    console.time('send');

    //Calculate initData for the result and correct presentation on clients.
    initData.msgCount = queryResult.total;
    initData.pageCount = Math.ceil(initData.msgCount / initData.limit);
    initData.offset = initData.limit * initData.currentPage;
    initData.offsetEnd = initData.offset + initData.limit;

    //if (!queryResult || (queryResult.ignore || (pdwMode && !queryResult.alias)))
    //    res.status(200).json({});
    //else
        res.status(200).json({init: initData, messages: queryResult.results});

    //queryResult.catch(err => {res.status(500).send(err)});

    console.timeEnd('send');

    /**
  if (dbtype == 'sqlite3') {
    var sql
    if (query != '') {
      sql = `SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch
      FROM messages_search_index
      LEFT JOIN messages ON messages.id = messages_search_index.rowid `;
    } else {
      sql = `SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch
      FROM messages `;
    }
    if (pdwMode) {
      if (adminShow && req.isAuthenticated()) {
        sql += " LEFT JOIN capcodes ON capcodes.id = messages.alias_id ";
      } else {
        sql += " INNER JOIN capcodes ON capcodes.id = messages.alias_id";
      }
    } else {
      sql += " LEFT JOIN capcodes ON capcodes.id = messages.alias_id ";
    }
    sql += ' WHERE';
    if (query != '') {
      sql += ` messages_search_index MATCH ?`;
    } else {
      if (address != '')
        sql += ` messages.address LIKE "${address}" OR messages.source = "${address}" OR `;
      if (agency != '')
        sql += ` messages.alias_id IN (SELECT id FROM capcodes WHERE agency = "${agency}" AND ignore = 0) OR `;
      sql += ' messages.id IS ?';
    }
    sql += " ORDER BY messages.timestamp DESC;";
  } else if (dbtype == 'mysql') {

  if (sql) {
    var data = []
    console.time('sql')
    db.raw(sql, query)
      .then((rows) => {
        if (rows) {
          if (dbtype == 'mysql') {
            // This is required for MySQL Compatibility - SQLite doesn't need this.
            rows = rows[0]
          }
          for (row of rows) {
            if (HideCapcode) {
              if (!req.isAuthenticated()) {
                row = {
                  "id": row.id,
                  "message": row.message,
                  "source": row.source,
                  "timestamp": row.timestamp,
                  "alias_id": row.alias_id,
                  "alias": row.alias,
                  "agency": row.agency,
                  "icon": row.icon,
                  "color": row.color,
                  "ignore": row.ignore,
                  "aliasMatch": row.aliasMatch
                };
              }
            }
            if (pdwMode) {
              if (adminShow && req.isAuthenticated() && !row.ignore || row.ignore == 0){
               data.push(row);
              } else {
              if (row.ignore == 0)
                data.push(row);
              }
            } else {
              if (!row.ignore || row.ignore == 0)
                data.push(row);
            }
          }
        } else {
          logger.main.info('empty results');
        }
        rowCount = data.length
        if (rowCount > 0) {
          console.timeEnd('sql');
          var result = data;
          console.time('initEnd');
          initData.msgCount = result.length;
          initData.pageCount = Math.ceil(initData.msgCount / initData.limit);
          if (initData.currentPage > initData.pageCount) {
            initData.currentPage = 0;
          }
          initData.offset = initData.limit * initData.currentPage;
          if (initData.offset < 0) {
            initData.offset = 0;
          }
          initData.offsetEnd = initData.offset + initData.limit;
          var limitResults = result.slice(initData.offset, initData.offsetEnd);

          console.timeEnd('initEnd');
          res.json({ 'init': initData, 'messages': limitResults });
        } else {
          console.timeEnd('sql');
          res.status(200).json({ 'init': {}, 'messages': [] });
        }
      })
      .catch((err) => {
        console.timeEnd('sql');
        logger.main.error(err);
        res.status(500).send(err);
      })
  }**/
});

///////////////////
//               //
// GET capcodes  //
//               //
///////////////////


// capcodes aren't pagified at the moment, this should probably be removed
router.get('/capcodes/init', isLoggedIn, function(req, res, next) {
  //set current page if specifed as get variable (eg: /?page=2)
  if (typeof req.query.page !== 'undefined') {
    var page = parseInt(req.query.page, 10);
    if (page > 0)
      initData.currentPage = page - 1;
  }
  db.from('capcodes')
    .select('id')
    .orderByRaw('id DESC LIMIT 1')
    .then((row) => {
      initData.msgCount = parseInt(row['id'], 10);
      //console.log(initData.msgCount);
      initData.pageCount = Math.ceil(initData.msgCount/initData.limit);
      var offset = initData.limit * initData.currentPage;
      initData.offset = initData.msgCount - offset;
      if (initData.offset < 0) {
        initData.offset = 0;
      }
      res.json(initData);
    })
    .catch((err) => {
      logger.main.error(err);
    })
});

// all capcode get methods are only used in admin area, so lock down to logged in users as they may contain sensitive data

router.get('/capcodes', isLoggedIn, async function(req, res, next) {
    try {
        const result = await Alias.query().orderByRaw("REPLACE(address, '_', '%')");
        res.status(200);
        res.json(result);
    }
    catch (err) {
        res.status(500);
        res.send(err)
    }
});

router.get('/capcodes/agency', isLoggedIn, async function(req, res, next) {
    try {
        const result = await Alias.query().distinct('agency');
        res.status(200);
        res.json(result);
    }
    catch (err) {
        res.status(500);
        res.send(err);
    }
});

router.get('/capcodes/alias', isLoggedIn, async function(req, res, next) {
    try {
        const result = await Alias.query().distinct('alias');
        res.status(200);
        res.json(result);
    }
    catch(err) {
        res.status(500);
        res.send(err);
    }
});


router.get('/capcodes/:id', isLoggedIn, async function(req, res, next) {
    const id = req.params.id;

    try {
        let result = await Alias.query().findById(id);
        if (result === undefined)
        {
            result = {"id": "",
                "address": "",
                "alias": "",
                "agency": "",
                "icon": "question",
                "color": "black",
                "ignore": 0,
                "pluginconf": {}}
        }

        res.status(200);
        res.json(result);
    }
   catch(err) {
        res.status(500);
        res.send(err);
    }
});

router.get('/capcodeCheck/:id', isLoggedIn, async function(req, res, next) {
    const id = req.params.id;
     try {
         let result = await Alias.query().findOne('address',id);
         if (result === undefined)
         {
             result = {"id": "",
                 "address": "",
                 "alias": "",
                 "agency": "",
                 "icon": "question",
                 "color": "black",
                 "ignore": 0,
                 "pluginconf": {}}
         }
         res.status(200).send(result);
     } catch (err) {
         res.status(500).send(err);
    }
});

router.get('/capcodes/agency/:id', isLoggedIn, async function(req, res, next) {
    const id = req.params.id;

    try {
        const result = await Alias.query()
            .where('agency','like',id);
        res.status(200).send(result);
    }
    catch(err)
    {
        res.status(500).send(err);
    }
});


router.post('/capcodeRefresh', isLoggedIn, async function (req, res, next) {
    nconf.load();
    try {
        console.time('db');
        const result = await Message.query()
            .patch({
                alias_id: Alias.query()
                    .select('id')
                    .where('messages.address', 'capcodes.address')
                    .orderByRaw("REPLACE(address, '_', '%') DESC LIMIT 1")
            });
        console.timeEnd('db');

        console.time('send');
        nconf.set('database:aliasRefreshRequired', 0);
        nconf.save();
        res.status(200).send({'status': 'ok'});
        console.timeEnd('send');
    } catch (err) {
        console.time('send');
        logger.main.error(err);
        res.status(500).send(err);
        console.timeEnd('send');
    }
});

router.use([handleError]);

module.exports = router;

function inParam (sql, arr) {
  return sql.replace('?#', arr.map(()=> '?' ).join(','));
}

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    if (req.method === 'GET') {
        if (apiSecurity || ((req.url.match(/capcodes/i) || req.url.match(/capcodeCheck/i)) && !(req.url.match(/agency$/)))) { //check if Secure mode is on, or if the route is a capcode route
            if (req.isAuthenticated()) {
                // if user is authenticated in the session, carry on
                return next();
            } else {
                //logger.main.debug('Basic auth failed, attempting API auth');
                passport.authenticate('localapikey', {session: false, failWithError: true})(req, res, next),
                    function (next) {
                        next();
                    },
                    function (res) {
                        return res.status(401).json({error: 'Authentication failed.'});
                    }
            }
        } else {
            return next();
        }
    } else if (req.method === 'POST') { //Check if user is authenticated for POST methods
        if (req.isAuthenticated()) {
            return next();
        } else {
            passport.authenticate('localapikey', {session: false, failWithError: true})(req, res, next),
                function (next) {
                    next();
                },
                function (res) {
                    return res.status(401).json({error: 'Authentication failed.'});
                }
        }
    }
}

function handleError(err, req, res, next) {
    const output = {
        error: {
            name: err.name,
            message: err.message,
            text: err.toString()
        }
    };
    const statusCode = err.status || 500;
    res.status(statusCode).json(output);
}
