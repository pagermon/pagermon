var express = require('express');
var bodyParser = require('body-parser');
var router = express.Router();
var basicAuth = require('express-basic-auth');
var bcrypt = require('bcryptjs');
var passport = require('passport');
var util = require('util');
var pluginHandler = require('../plugins/pluginHandler');
var logger = require('../log');
require('../config/passport')(passport); // pass passport for configuration

var nconf = require('nconf');
var conf_file = './config/config.json';
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

var dbtype = nconf.get('database:type')
var dbfile = nconf.get('database:file')
var dbserver = nconf.get('database:server')
var dbdb = nconf.get('database:database')
var dbusername = nconf.get('database:username')
var dbpassword = nconf.get('database.password')

var db = require('knex')({
  client: dbtype,
  connection: {
    filename: dbfile,
    host : dbserver,
    user : dbusername,
    password : dbpassword,
    database : dbdb
  },
  useNullAsDefault: true,
  debug: true,
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

if (HideCapcode) {
  router.get('/capcodes', isLoggedIn, function(req, res, next) {
    db.select('*').from('capcodes').orderByRaw("REPLACE(address, '_', '%')").then((rows) => {
      res.json(rows);
    }).catch((err) => {
      return next(err);
    })
});
} else {
  router.get('/capcodes', isSecMode, function(req, res, next) {
    db.select('*').from('capcodes').orderByRaw("REPLACE(address, '_', '%')").then((rows) => {
      res.json(rows);
    }).catch((err) => {
      return next(err);
    })
});
}

///////////////////
//               //
// GET messages  //
//               //
///////////////////

/* GET message listing. */
router.get('/messages', isSecMode, function(req, res, next) {
  nconf.load();
  console.time('init');
  var pdwMode = nconf.get('messages:pdwMode');
  var maxLimit = nconf.get('messages:maxLimit');
  var defaultLimit = nconf.get('messages:defaultLimit');
  initData.replaceText = nconf.get('messages:replaceText');
  if (typeof req.query.page !== 'undefined') {
    var page = parseInt(req.query.page, 10);
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
  if (pdwMode) {
    var subquery = db.from('capcodes').where('ignore', '=', 0).select('id')
  } else {
    var subquery = db.from('capcodes').where('ignore', '=', 1).select('id')
  }
  db.from('messages').where(function () {
    if (pdwMode) {
      this.from('messages').where('alias_id', 'in', subquery)
    } else {
      this.from('messages').where('alias_id', 'not in', subquery).orWhereNull('alias_id')
    }
  }).count('* as msgcount')
    .then(function(initcount) {
      var count = initcount[0]
      if (count) {
      initData.msgCount = count.msgcount;
      initData.pageCount = Math.ceil(initData.msgCount/initData.limit);
      if (initData.currentPage > initData.pageCount) {
        initData.currentPage = 0;
      }
      initData.offset = initData.limit * initData.currentPage;
      if (initData.offset < 0) {
        initData.offset = 0;
      }
      initData.offsetEnd = initData.offset + initData.limit;
      console.timeEnd('init');
      console.time('sql');

      var orderby;
      orderby = "messages.timestamp DESC LIMIT "+initData.limit+" OFFSET "+initData.offset;
      var result = [];
      var rowCount

      db.from('messages')
        .select('messages.*', 'capcodes.alias', 'capcodes.agency', 'capcodes.icon', 'capcodes.color', 'capcodes.ignore', function () {
          this.select('capcodes.id')
          .as('aliasMatch')
        })
        .modify(function(queryBuilder) {
          if (pdwMode) {
            queryBuilder.innerJoin('capcodes', 'capcodes.id', '=', 'messages.alias_id').where('capcodes.ignore', 0)
          } else {
            queryBuilder.leftJoin('capcodes', 'capcodes.id', '=', 'messages.alias_id').where('capcodes.ignore', 0).orWhereNull('capcodes.ignore')
          }
        })
        .orderByRaw(orderby)
        .then(rows => {
          rowCount = rows.length
          for (row of rows) {
              //outRow = JSON.parse(newrow);
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
              if (row) {
                result.push(row);
              } else {
                logger.main.info('empty results');
              }
          } 
        })
        .catch(err => { 
          console.log(err); 
        })
        .finally(() => {
          if (rowCount > 0) {
            console.timeEnd('sql');
            //var limitResults = result.slice(initData.offset, initData.offsetEnd);
            console.time('send');
            res.status(200).json({'init': initData, 'messages': result});
            console.timeEnd('send');
          } else {
            res.status(200).json({'init': {}, 'messages': []});
          }
  });
}
});
});

router.get('/messages/:id', isSecMode, function(req, res, next) {
  nconf.load();
  var pdwMode = nconf.get('messages:pdwMode');
  var id = req.params.id;

  db.from('messages')
    .select('messages.*', 'capcodes.alias', 'capcodes.agency', 'capcodes.icon', 'capcodes.color', 'capcodes.ignore', function () {
      this.select('capcodes.id')
        .as('aliasMatch')
    })
    .leftJoin('capcodes', 'capcodes.id', '=', 'messages.alias_id')
    .where(['messages.id', id])
    .then((row) => {
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
        if(row.ignore == 1) {
          res.status(200).json({});
        } else {
          if(pdwMode && !row.alias) {
            res.status(200).json({});
          } else {
            res.status(200).json(row);
          }
        }
    })
    .catch((err) => {
      res.status(500).send(err);
    })
});

/* GET message search */
router.get('/messageSearch', isSecMode, function(req, res, next) {
  nconf.load();
  console.time('init');
  var dbtype = nconf.get('database:type')
  var pdwMode = nconf.get('messages:pdwMode');
  var maxLimit = nconf.get('messages:maxLimit');
  var defaultLimit = nconf.get('messages:defaultLimit');
  initData.replaceText = nconf.get('messages:replaceText');

  if (typeof req.query.page !== 'undefined') {
    var page = parseInt(req.query.page, 10);
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

  var rowCount;
  var query;
  var agency;
  var address;
  // dodgy handling for unexpected results
  if (typeof req.query.q !== 'undefined') { query = req.query.q;
  } else { query = ''; }
  if (typeof req.query.agency !== 'undefined') { agency = req.query.agency;
  } else { agency = ''; }
  if (typeof req.query.address !== 'undefined') { address = req.query.address;
  } else { address = ''; }

  // set select commands based on query type
  // address can be address or source field
  
  if(dbtype == 'sqlite3') {
    var sql
    if (query != '') {
      sql = `SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch
      FROM messages_search_index
      LEFT JOIN messages ON messages.id = messages_search_index.rowid `;
    } else {
      sql = `SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch 
      FROM messages `;
    }
    if(pdwMode) {
      sql += " INNER JOIN capcodes ON capcodes.id = messages.alias_id";
    } else {
      sql += " LEFT JOIN capcodes ON capcodes.id = messages.alias_id ";
    }
    sql += ' WHERE';
    if(query != '') {
      sql += ` messages_search_index MATCH ?`;
    } else {
      if(address != '')
        sql += ` messages.address LIKE "${address}" OR messages.source = "${address}" OR `;
      if(agency != '')
        sql += ` messages.alias_id IN (SELECT id FROM capcodes WHERE agency = "${agency}" AND ignore = 0) OR `;
      sql += ' messages.id IS ?';
    }
  
    sql += " ORDER BY messages.timestamp DESC;";
    var data = []
    db.raw(sql, query)
      .then ((rows) => {
       console.log(rows.length)
        if (rows) { 
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
            if (row.ignore == 0)
              data.push(row);
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
        initData.pageCount = Math.ceil(initData.msgCount/initData.limit);
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
        res.json({'init': initData, 'messages': limitResults});
      } else {
        console.timeEnd('sql');
        res.status(200).json({'init': {}, 'messages': []});
      }
      })
      .catch ((err) => {
        console.timeEnd('sql');
        logger.main.error(err);
        res.status(500).send(err);
      })
  }
});

///////////////////
//               //
// GET capcodes  //
//               //
///////////////////


// capcodes aren't pagified at the moment, this should probably be removed
router.get('/capcodes/init', isSecMode, function(req, res, next) {
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
router.get('/capcodes/:id', isLoggedIn, function(req, res, next) {
  var id = req.params.id;
    db.from('capcodes')
      .select('*')
      .where('id', id)
      .then(function (row) {
        if (row.length > 0) {
          row = row[0]
          row.pluginconf = parseJSON(row.pluginconf);
          res.status(200);
          res.json(row);
        } else {
          row = {
            "id": "",
            "address": "",
            "alias": "",
            "agency": "",
            "icon": "question",
            "color": "black",
            "ignore": 0,
            "pluginconf": {}
          };
          res.status(200);
          res.json(row);
        }
      })
      .catch((err) => {
        res.status(500);
        res.send(err);
      })
});

router.get('/capcodeCheck/:id', isLoggedIn, function(req, res, next) {
  var id = req.params.id;
    db.from('capcodes')
      .select('*')
      .where('address', id)
      .then((row) => {
        if (row.length > 0) {
          row = row[0]
          row.pluginconf = parseJSON(row.pluginconf);
          res.status(200);
          res.json(row);
        } else {
          row = {
            "id": "",
            "address": "",
            "alias": "",
            "agency": "",
            "icon": "question",
            "color": "black",
            "ignore": 0,
            "pluginconf": {}
          };
          res.status(200);
          res.json(row);
        }
    })
    .catch((err) => {
      res.status(500);
      res.send(err);
    })
});

router.get('/capcodes/agency/:id', isLoggedIn, function(req, res, next) {
  var id = req.params.id;
    db.from('capcodes')
      .select('*')
      .where('agency', 'like', id)
      .then((rows) => {    
        res.status(200);
        res.json(rows);
      })
      .catch((err) => {
        res.status(500);
        res.send(err);
      })
});

// lock down POST routes
router.all('*',
  passport.authenticate('localapikey', { session: false, failWithError: true }),
  function(req, res, next) {
    next();
  },
  function(err, req, res, next) {
    logger.main.debug('API key auth failed, attempting basic auth');
    isLoggedIn(req, res, next);
  }
);

//////////////////////////////////
//
// POST calls below
//
//////////////////////////////////
router.post('/messages', function(req, res, next) {
  nconf.load();
  if (req.body.address && req.body.message) {
    var filterDupes = nconf.get('messages:duplicateFiltering');
    var dupeLimit = nconf.get('messages:duplicateLimit') || 0; // default 0
    var dupeTime = nconf.get('messages:duplicateTime') || 0; // default 0
    var pdwMode = nconf.get('messages:pdwMode');
    var data = req.body;
        data.pluginData = {};

    // send data to pluginHandler before proceeding
    logger.main.debug('beforeMessage start');
    pluginHandler.handle('message', 'before', data, function(response) {
      logger.main.debug(util.format('%o',response));
      logger.main.debug('beforeMessage done');
      if (response && response.pluginData) {
        // only set data to the response if it's non-empty and still contains the pluginData object
        data = response;
      }
      if (data.pluginData.ignore) {
        // stop processing
        res.status(200);
        return res.send('Ignoring filtered');
      }
        var address = data.address || '0000000';
        var message = data.message.replace(/["]+/g, '') || 'null';
        var datetime = data.datetime || 1;
        var timeDiff = datetime - dupeTime;
        var source = data.source || 'UNK';
        var dupeorderby = 'id DESC LIMIT ' + dupeLimit
        db.from('messages')
          .select('*')
          .modify(function (queryBuilder) {
            if ((dupeLimit != 0) && (dupeTime != 0)) {
              queryBuilder.where('id', 'in', function () {
                this.select('*')
                    //this wierd subquery is to keep mysql happy 
                    .from(function () {
                      this.select('id')
                      .from('messages')
                      .where('timestamp', '>', timeDiff)
                      .orderByRaw(dupeorderby)
                      .as('temp_tab')
                    })  
              })
              .andWhere('message', 'like', message)
              .andWhere('address', 'like', address)
            } else if ((dupeLimit) !=0 && (dupeTime == 0)) {
              queryBuilder.where('id', 'in', function () {
                this.select('*')
                    //this wierd subquery is to keep mysql happy
                    .from(function () {
                      this.select('id')
                          .from('messages')
                          .orderByRaw(dupeorderby)
                          .as('temp_tab')
                    })
              })
              .andWhere('message', 'like', message)
              .andWhere('address', 'like', address)
            } else if ((dupeLimit) == 0 && (dupeTime != 0)) {
              queryBuilder.where('id', 'in', function () {
                this.select('id')
                    .from('messages')
                    .where('timestamp', '>', timeDiff)
              })
              .andWhere('message', 'like', message)
              .andWhere('address', 'like', address)
            } else {
              queryBuilder.where('message', 'like', message)
                          .andWhere('address', '=', address)
            }
          })
          .then((row) => { 
            if (row.length > 0 && filterDupes) {
              logger.main.info(util.format('Ignoring duplicate: %o', message));
              res.status(200);
              res.send('Ignoring duplicate');
            } else {
              db.from('capcodes')
                  .select('id', 'ignore')
                  .whereRaw(address+ " LIKE address")
                  .orderByRaw("REPLACE(address, '_', '%') DESC")
                  .then((row) => {
                    var insert;
                    var alias_id = null;
                    if (row.length > 0) {
                      row = row[0]
                      if (row.ignore == 1) {
                        insert = false;
                        logger.main.info('Ignoring filtered address: '+address+' alias: '+row.id);
                      } else {
                        insert = true;
                        alias_id = row.id;
                      }
                    } else {
                      insert = true;
                    }

                    // overwrite alias_id if set from plugin
                    if (data.pluginData.aliasId) {
                      alias_id = data.pluginData.aliasId;
                    }

                    if (insert == true) {
                      var insertmsg = {address: address, message: message, timestamp: datetime, source: source, alias_id: alias_id}
                      db('messages').insert(insertmsg)
                                    .then((result) => {
                                      // emit the full message
                                      db.from('messages')
                                        .select('messages.*', 'capcodes.alias', 'capcodes.agency', 'capcodes.icon', 'capcodes.color', 'capcodes.ignore', 'capcodes.pluginconf', function () {
                                          this.select('capcodes.id')
                                            .as('aliasMatch')
                                        })
                                        .modify(function(queryBuilder) {
                                          if (pdwMode) {
                                            queryBuilder.innerJoin('capcodes', 'capcodes.id', '=', 'messages.alias_id')
                                          } else {
                                            queryBuilder.leftJoin('capcodes', 'capcodes.id', '=', 'messages.alias_id')
                                          }
                                        })
                                        .where('messages.id', '=', result[0])
                                        .then((row) => {
                                        if(row.length > 0) {
                                          row = row[0]
                                          // send data to pluginHandler after processing
                                          row.pluginData = data.pluginData;
                                          
                                          if (row.pluginconf) {
                                            row.pluginconf = parseJSON(row.pluginconf);
                                          } else {
                                            row.pluginconf = {};
                                          }
                                          logger.main.debug('afterMessage start');
                                          pluginHandler.handle('message', 'after', row, function(response) {
                                            logger.main.debug(util.format('%o',response));
                                            logger.main.debug('afterMessage done');
                                            // remove the pluginconf object before firing socket message
                                            delete row.pluginconf;
                                            if (HideCapcode || apiSecurity) {
                                              //Emit full details to the admin socket
                                              req.io.of('adminio').emit('messagePost', row);
                                              //Only emit to normal socket if HideCapcode is on and ApiSecurity is off.
                                              if (HideCapcode && !apiSecurity) {
                                                // Emit No capcode to normal socket
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
                                                req.io.emit('messagePost', row);
                                              }
                                            } else {
                                              //Just emit - No Security enabled
                                              req.io.emit('messagePost', row);
                                            }
                                          });
                                        }
                                        res.status(200).send(''+result);
                                      })
                                      .catch((err) => {
                                        res.status(500).send(err);
                                        console.log(err)
                                      })          
                            })
                            .catch ((err) => {
                              res.status(500).send(err);
                              console.log(err)
                            })
                    } else {
                        res.status(200);
                        res.send('Ignoring filtered');
                    }
              })
              .catch((err) => {
                logger.main.error(err)
              })
              }
            })
            .catch((err) => {
             res.status(500).send(err);
             console.log(err)
            })
      })
  } else {
    res.status(500).json({message: 'Error - address or message missing'});
  }
});

router.post('/capcodes', function(req, res, next) {
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
        .then((result) => { 
          res.status(200);
          res.send(''+result[0]);
          if (!updateRequired || updateRequired == 0) {
            nconf.set('database:aliasRefreshRequired', 1);
            nconf.save();
          }
        })
        .catch ((err) => {
          console.log(err)
          .status(500).send(err);
        })
      logger.main.debug(util.format('%o', req.body || 'no request body'));
  } else {
    res.status(500).json({message: 'Error - address or alias missing'});
  }
});

router.post('/capcodes/:id', function(req, res, next) {
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
            res.status(200).send({'status': 'ok'});
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
      if (id == 'new')
        id = null;
      var address = req.body.address || 0;
      var alias = req.body.alias || 'null';
      var agency = req.body.agency || 'null';
      var color = req.body.color || 'black';
      var icon = req.body.icon || 'question';
      var ignore = req.body.ignore || 0;
      var pluginconf = JSON.stringify(req.body.pluginconf) || "{}";
      var updateAlias = req.body.updateAlias || 0;
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
              .update('alias_id', function() {
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
            res.status(200).send({'status': 'ok', 'id': result[0]});
        })
        .catch((err) => {
          console.timeEnd('insert');
          res.status(500).send(err);
        })
        logger.main.debug(util.format('%o',req.body || 'request body empty'));
    } else {
      res.status(500).json({message: 'Error - address or alias missing'});
    }
  }
});

router.delete('/capcodes/:id', function(req, res, next) {
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

router.post('/capcodeRefresh', function(req, res, next) {
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
  // if user is authenticated in the session, carry on
  if (req.isAuthenticated()) {
    return next();
  } else {
    return res.status(401).json({error: 'Authentication failed.'});
  }
}

// route middleware to make sure a user is logged in, only if in sec mode
function isSecMode(req, res, next) {
  if (apiSecurity) {
    // if user is authenticated in the session, carry on
    if (req.isAuthenticated()) {
      return next();
    } else {
      return res.status(401).json({error: 'Authentication failed.'});
    }
  } else {
    // if not sec mode then continue
    return next();
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
