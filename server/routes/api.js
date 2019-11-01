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
var initData = {};
    initData.limit = nconf.get('messages:defaultLimit');
    initData.replaceText = nconf.get('messages:replaceText');
    initData.currentPage = 0;
    initData.pageCount = 0;
    initData.msgCount = 0;
    initData.offset = 0;

// auth variables
var HideCapcode = nconf.get('messages:HideCapcode');
var apiSecurity = nconf.get('messages:apiSecurity');
var dbtype = nconf.get('database:type');

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
         if (result == undefined)
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
         res.send(result);
     }
    catch(err) {
        res.status(500);
        res.send(err);
    }
});

router.get('/capcodes/agency/:id', isLoggedIn, async function(req, res, next) {
    const id = req.params.id;

    try {
        const result = await Alias.query()
            .where('agency','like',id);
        res.status(200);
        res.json(result);
    }
    catch(err)
    {
        res.status(500);
        res.send(err);
    }
});

//////////////////////////////////
//
// POST calls below
//
//////////////////////////////////

// dupe init
var msgBuffer = [];

router.post('/messages', isLoggedIn, async function(req, res, next) {
    nconf.load();
    if (req.body.address && req.body.message) {
        const filterDupes = nconf.get('messages:duplicateFiltering');
        const dupeLimit = nconf.get('messages:duplicateLimit') || 0; // default 0
        const dupeTime = nconf.get('messages:duplicateTime') || 0; // default 0
        const pdwMode = nconf.get('messages:pdwMode');
        const adminShow = nconf.get('messages:adminShow');
        let data = req.body;
        data.pluginData = {};

        if (filterDupes) {
            // this is a bad solution and tech debt that will bite us in the ass if we ever go HA, but that's a problem for future me and that guy's a dick
            const datetime = data.datetime || 1;
            const timeDiff = datetime - dupeTime;
            // if duplicate filtering is enabled, we want to populate the message buffer and check for duplicates within the limits
            const matches = _.where(msgBuffer, {message: data.message, address: data.address});
            if (matches.length > 0) {
                if (dupeTime !== 0) {
                    // search the matching messages and see if any match the time constrain
                    if (_.find(matches, function(msg){ return msg.datetime > timeDiff; })) {
                    logger.main.info(util.format('Ignoring duplicate: %o', data.message));
                    res.status(200);
                    return res.send('Ignoring duplicate');
                    }
                } else {
                    // if no dupeTime then just end the search now, we have matches
                    logger.main.info(util.format('Ignoring duplicate: %o', data.message));
                    res.status(200);
                    return res.send('Ignoring duplicate');
                }
            }
            // no matches, maintain the array
            let dupeArrayLimit = dupeLimit;
            if (dupeArrayLimit === 0)
                dupeArrayLimit = 25; // should provide sufficient buffer, consider increasing if duplicates appear when users have no dupeLimit

            if (msgBuffer.length > dupeArrayLimit)
                msgBuffer.shift();

            msgBuffer.push({message: data.message, datetime: data.datetime, address: data.address});
        }

        // send data to pluginHandler before proceeding
        logger.main.debug('beforeMessage start');
        const beforePlugin = await pluginHandler.handle('message', 'before', data);
        logger.main.debug(util.format('Before Plugin return: %o', beforePlugin));
        logger.main.debug('beforeMessage done');

        // only set data to the response if it's non-empty and still contains the pluginData object
        if (beforePlugin && beforePlugin.pluginData)
            data = beforePlugin;

        if (data.pluginData.ignore) {
            // stop processing
            res.status(200);
            return res.send('Ignoring filtered');
        }

        const address = data.address || '0000000';
        const message = data.message || 'null';
        const datetime = data.datetime || 1;
        const timeDiff = datetime - dupeTime;
        const source = data.source || 'UNK';

        try {
            const dupeMessages = await Message.query()
                .modify(builder => {
                    if ((dupeLimit != 0) && (dupeTime != 0)) {
                        builder.where('timestamp', '>', timeDiff)
                            .where('message', message)
                            .where('address', address)
                            .orderBy('id', 'DESC')
                            .limit(dupeLimit);
                    } else if ((dupeLimit == 0) && (dupeTime != 0)) {
                        builder.where('timestamp', '>', timeDiff)
                            .where('message', message)
                            .where('address', address)
                    } else {
                        builder.where('message', message)
                            .where('address', address)
                    }
                });
            if (dupeMessages && filterDupes && dupeMessages.length > 0) {
                logger.main.info(util.format('Ignoring duplicate: %o', message));
                res.status(200);
                res.send('Ignoring duplicate');
            } else {
                const matchAlias = await Alias.query()
                    .findOne('address', address)
                    .orderByRaw("REPLACE(address, '_', '%') DESC");

                let insert;
                let alias_id;
                if (matchAlias) {
                    if (matchAlias.ignore === 1) {
                        insert = false;
                        logger.main.info('Ignoring filtered address: ' + address + ' alias: ' + row.id);
                    } else {
                        insert = true;
                        alias_id = matchAlias.id;
                    }
                } else insert = true;
                if (data.pluginData.aliasId)
                    alias_id = data.pluginData.aliasId;

                if (insert) {
                    const insert = await Message.query()
                        .insertAndFetch({address: address, message: message, timestamp: datetime, source: source, alias_id: alias_id});

                    const result = await Message.query()
                        .findById(insert.id)
                        .modify('messageViewLeft')
                        .modify(builder => {
                            if (HideCapcode && !req.isAuthenticated())
                                builder.omit(Message, ['address']);
                        });

                    logger.main.debug('Refetched: '+JSON.stringify(result));
                    result.pluginData = data.pluginData;
                    logger.main.debug('afterMessage start');
                    const response = await pluginHandler.handle('message','after', result);
                    logger.main.debug(util.format('Plugin handler after: %o',response));
                    logger.main.debug('afterMessage done');

                    //removing Plugin Configuration before firing socket message;
                    delete result.pluginconf;
                    if (HideCapcode || apiSecurity) {
                        //Emit full details to the admin socket
                        if (pdwMode && adminShow) {
                            req.io.of('adminio').emit('messagePost', result);
                        } else if (!pdwMode || result.aliasMatch != null) {
                            req.io.of('adminio').emit('messagePost', result);
                        } else {
                            // do nothing if PDWMode on and AdminShow is disabled
                        }
                        //Only emit to normal socket if HideCapcode is on and ApiSecurity is off.
                        if (HideCapcode && !apiSecurity) {
                            if (pdwMode && result.aliasMatch == null) {
                                //do nothing if pdwMode on and there isn't an aliasmatch
                            } else {
                                // Emit No capcode to normal socket
                                delete result.address;
                                req.io.emit('messagePost', result);
                            }
                        }
                    }
                    else {
                        if (pdwMode && insert.aliasMatch == null) {
                            if (adminShow) {
                                req.io.of('adminio').emit('messagePost', insert);
                            } else {
                                //do nothing
                            }
                        } else {
                            //Just emit - No Security enabled
                            req.io.of('adminio').emit('messagePost', insert);
                            req.io.emit('messagePost', insert);
                        }
                    }

                    res.status(200).send(''+insert);
                }
            }
        }
        catch (err) {
            res.status(500).send(err);
            logger.main.error(err)
        }

    }
    else {
    res.status(500).json({message: 'Error - address or message missing'});
    }
});

router.post('/capcodes', isLoggedIn, function(req, res, next) {
  nconf.load();
  var updateRequired = nconf.get('database:aliasRefreshRequired');
  if (req.body.address && req.body.alias) {
    var id = req.body.id || null;
    var address = req.body.address || 0;
    var alias = req.body.alias || 'null';
    var agency = req.body.agency || 'null';
    var color = req.body.color || 'black';
    var icon = req.body.icon || 'question';
    var ignore = req.body.ignore || 0;
    var pluginconf = JSON.stringify(req.body.pluginconf) || "{}";
      db.from('capcodes')
        .where('id', '=', id)
        .modify(function (queryBuilder) {
          if (id == null) {
            queryBuilder.insert({
              id: id,
              address: address,
              alias: alias,
              agency: agency,
              color: color,
              icon: icon,
              ignore: ignore,
              pluginconf: pluginconf
            })
          } else {
            queryBuilder.update({
              id: id,
              address: address,
              alias: alias,
              agency: agency,
              color: color,
              icon: icon,
              ignore: ignore,
              pluginconf: pluginconf
            })
          }
        })
        .returning('id')
        .then((result) => {
          res.status(200);
          res.send(''+result);
          if (!updateRequired || updateRequired == 0) {
            nconf.set('database:aliasRefreshRequired', 1);
            nconf.save();
          }
        })
        .catch ((err) => {
          logger.main.error(err)
          .status(500).send(err);
        })
      logger.main.debug(util.format('%o', req.body || 'no request body'));
  } else {
    res.status(500).json({message: 'Error - address or alias missing'});
  }
});

router.post('/capcodes/:id', isLoggedIn, function(req, res, next) {
  var id = req.params.id || req.body.id || null;
  nconf.load();
  var updateRequired = nconf.get('database:aliasRefreshRequired');
  if (id == 'deleteMultiple') {
    // do delete multiple
    var idList = req.body.deleteList || [0, 0];
    if (!idList.some(isNaN)) {
      logger.main.info('Deleting: '+idList);
        db.from('capcodes')
          .del()
          .where('id', 'in', idList)
          .then((result) => {
            res.status(200).send({ 'status': 'ok' });
            if (!updateRequired || updateRequired == 0) {
              nconf.set('database:aliasRefreshRequired', 1);
              nconf.save();
            }
          }).catch((err) => {
            res.status(500).send(err);
          })
    } else {
      res.status(500).send({'status': 'id list contained non-numbers'});
    }
  } else {
    if (req.body.address && req.body.alias) {
      if (id == 'new') {
        id = null;
      }
      var address = req.body.address || 0;
      var alias = req.body.alias || 'null';
      var agency = req.body.agency || 'null';
      var color = req.body.color || 'black';
      var icon = req.body.icon || 'question';
      var ignore = req.body.ignore || 0;
      var pluginconf = JSON.stringify(req.body.pluginconf) || "{}";
      var updateAlias = req.body.updateAlias || 0;
      var result
      console.time('insert');
      db.from('capcodes')
        .where('id', '=', id)
        .modify(function(queryBuilder) {
          if (id == null) {
            queryBuilder.insert({
              id: id,
              address: address,
              alias: alias,
              agency: agency,
              color: color,
              icon: icon,
              ignore: ignore,
              pluginconf: pluginconf
            })
          } else {
            queryBuilder.update({
              id: id,
              address: address,
              alias: alias,
              agency: agency,
              color: color,
              icon: icon,
              ignore: ignore,
              pluginconf: pluginconf
            })
          }
        })
        .then((result) => {
            console.timeEnd('insert');
            if (updateAlias == 1) {
              console.time('updateMap');
              db('messages')
                .update('alias_id', function () {
                  this.select('id')
                    .from('capcodes')
                    .where('messages.address', 'like', 'address')
                    .orderByRaw("REPLACE(address, '_', '%') DESC LIMIT 1")
                })
                .catch((err) => {
                  logger.main.error(err);
                })
                .finally(() => {
                  console.timeEnd('updateMap');
                })
            } else {
              if (!updateRequired || updateRequired == 0) {
                nconf.set('database:aliasRefreshRequired', 1);
                nconf.save();
              }
            }
            res.status(200).send({ 'status': 'ok', 'id': result })
        })
        .catch((err) => {
          console.timeEnd('insert');
          logger.main.error(err)
          res.status(500).send(err);
        })
        logger.main.debug(util.format('%o',req.body || 'request body empty'));
    } else {
      res.status(500).json({message: 'Error - address or alias missing'});
    }
  }
});

router.delete('/capcodes/:id', isLoggedIn, function(req, res, next) {
  // delete single alias
  var id = parseInt(req.params.id, 10);
  nconf.load();
  var updateRequired = nconf.get('database:aliasRefreshRequired');
  logger.main.info('Deleting '+id);
    db.from('capcodes')
      .del()
      .where('id', id)
      .then((result) => {
        res.status(200).send({'status': 'ok'});
        if (!updateRequired || updateRequired == 0) {
          nconf.set('database:aliasRefreshRequired', 1);
          nconf.save();
        }
      })
      .catch((err) => {
        res.status(500).send(err);
      })
    logger.main.debug(util.format('%o',req.body || 'request body empty'));
});

router.post('/capcodeRefresh', isLoggedIn, function(req, res, next) {
  nconf.load();
  console.time('updateMap');
  db('messages').update('alias_id', function() {
    this.select('id')
        .from('capcodes')
        .where(db.ref('messages.address'), 'like', db.ref('capcodes.address') )
        .orderByRaw("REPLACE(address, '_', '%') DESC LIMIT 1")
  })
  .then((result) => {
      console.timeEnd('updateMap');
      nconf.set('database:aliasRefreshRequired', 0);
      nconf.save();
      res.status(200).send({'status': 'ok'});
  })
  .catch((err) => {
    logger.main.error(err);
    console.timeEnd('updateMap');
  })
});

router.use([handleError]);

module.exports = router;

function inParam (sql, arr) {
  return sql.replace('?#', arr.map(()=> '?' ).join(','));
}

// route middleware to make sure a user is logged in
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

function handleError(err,req,res,next){
  var output = {
    error: {
      name: err.name,
      message: err.message,
      text: err.toString()
    }
  };
  var statusCode = err.status || 500;
  res.status(statusCode).json(output);
}

function parseJSON(json) {
  var parsed;
  try {
    parsed = JSON.parse(json)
  } catch (e) {
    // ignore errors
  }
  return parsed;
}
