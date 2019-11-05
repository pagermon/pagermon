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

/*
 * MIDDLEWARE IMPORT
 */
router.use(bodyParser.json());       // to support JSON-encoded bodies
router.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));
router.use(function (req, res, next) {
  res.locals.login = req.isAuthenticated();
  next();
});
router.use(isLoggedIn);

// defaults
const initData = {};
    initData.limit = nconf.get('messages:defaultLimit');
    initData.replaceText = nconf.get('messages:replaceText');
    initData.currentPage = 0;
    initData.pageCount = 0;
    initData.msgCount = 0;
    initData.offset = 0;

let msgBuffer = [];

// auth variables
const HideCapcode = nconf.get('messages:HideCapcode');
const apiSecurity = nconf.get('messages:apiSecurity');

function isLoggedIn(req, res, next) {
    if (req.method === 'GET') {
        if (apiSecurity || ((req.url.match(/capcodes/i) || req.url.match(/capcodeCheck/i)) && !(req.url.match(/agency$/)))) { //check if Secure mode is on, or if the route is a capcode route
            if (req.isAuthenticated()) {
                // if user is authenticated in the session, carry on
                logger.main.debug('Calling next 54');
                return next();
            } else {
                //logger.main.debug('Basic auth failed, attempting API auth');
                passport.authenticate('localapikey', {session: false, failWithError: true})(req, res, next),
                    function (next) {
                        logger.main.debug('Calling next 60');
                        next();
                    },
                    function (res) {
                        logger.main.debug('Auth failed 64');
                        return res.status(401).json({error: 'Authentication failed.'});
                    }
            }
        } else {
            logger.main.debug('calling next 69');
            return next();
        }
    } else if (req.method === 'POST') { //Check if user is authenticated for POST methods
        if (req.isAuthenticated()) {
            logger.main.debug('calling next 74');
            return next();
        } else {
            passport.authenticate('localapikey', {session: false, failWithError: true})(req, res, next),
                function (next) {
                    logger.main.debug('calling next 79');
                    next();
                },
                function (res) {
                    logger.main.debug('Auth failed 83');
                    return res.status(401).json({error: 'Authentication failed.'});
                }
        }
    }
}

///////////////////
//               //
// Messages      //
//               //
///////////////////

/**
 * GET message
 * POST message
 */
router.route('/messages')
    .get(async (req, res, next) => {
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
        .modify('defaultSort')
        .joinEager('alias(messageView)')
        .modify(builder => {
            //Select join method and filtering according to pdwMode setting
            if (!pdwMode || (adminShow && req.isAuthenticated()))
                builder
                    .eagerOptions({joinOperation: 'leftJoin'})
                    .modifyEager('alias', builder => {
                        builder.orWhereNull('ignore')
                    });
            else
                builder
                    .eagerOptions({joinOperation: 'innerJoin'});

            //Hide capcode if hideCapcode enabled and not logged in.
            if (HideCapcode && !req.isAuthenticated()) {
                logger.main.debug('HideCap && !isAuth');
                builder.omit(Message,['address'])
            }

        });
    let queryResult = await query.catch(err => {logger.main.error(err);});

    //Check if the requested page contains messages. If not, try page 0. If this also has no messages, send empty result
    if (!queryResult || !queryResult.results || queryResult.results.length === 0) {
        initData.currentPage = 0;
        queryResult = await query.page(initData.currentPage, initData.limit).catch(err => {logger.main.error(err);});
        if (queryResult && queryResult.results && queryResult.results.length === 0)
            res.status(200).json({'init': {}, 'messages': []});
    }

        initData.msgCount = queryResult.total;
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
    })
    .post(async (req, res, next) => {
        nconf.load();
        logger.main.debug(util.format(req.body));
        try {
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
                            if (_.find(matches, function (msg) {
                                return msg.datetime > timeDiff;
                            })) {
                                logger.main.info(util.format('Ignoring duplicate: %o', data.message));
                                res.status(200).send('Ignoring duplicate');
                                return;
                            }
                        } else {
                            // if no dupeTime then just end the search now, we have matches
                            logger.main.info(util.format('Ignoring duplicate: %o', data.message));
                            res.status(200).send('Ignoring duplicate');
                            return;
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
                    res.status(200).send('Ignoring filtered');
                    return;
                }

                const address = data.address || '0000000';
                const message = data.message || 'null';
                const datetime = data.datetime || 1;
                const timeDiff = datetime - dupeTime;
                const source = data.source || 'UNK';
                const dupeMessages = await Message.query()
                    .modify(builder => {
                        if ((dupeLimit !== 0) && (dupeTime !== 0)) {
                            builder.where('timestamp', '>', timeDiff)
                                .where('message', message)
                                .where('address', address)
                                .orderBy('id', 'DESC')
                                .limit(dupeLimit);
                        } else if ((dupeLimit === 0) && (dupeTime !== 0)) {
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
                    res.status(200).send('Ignoring duplicate');
                } else {
                    const matchAlias = await Alias.query()
                        .findOne(raw('? LIKE address', address))
                        .orderByRaw("REPLACE(address, '_', '%') DESC");

                    let insert;
                    let alias_id;
                    if (matchAlias) {
                        if (matchAlias.ignore === 1) {
                            insert = false;
                            logger.main.info('Ignoring filtered address: ' + address + ' alias: ' + matchAlias.id);
                        } else {
                            insert = true;
                            alias_id = matchAlias.id;
                        }
                    } else insert = true;
                    if (data.pluginData.aliasId)
                        alias_id = data.pluginData.aliasId;

                    if (insert) {
                        const insert = await Message.query()
                            .insertAndFetch({
                                address: address,
                                message: message,
                                timestamp: datetime,
                                source: source,
                                alias_id: alias_id
                            });

                        const result = await Message.query()
                            .findById(insert.id)
                            .eager('alias')
                            .modify(builder => {
                                if (HideCapcode && !req.isAuthenticated())
                                    builder.omit(Message, ['address']);
                            });

                        result.pluginData = data.pluginData;
                        logger.main.debug('afterMessage start');
                        const response = await pluginHandler.handle('message', 'after', result);
                        logger.main.debug(util.format('Plugin handler after: %o', response));
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
                        } else {
                            if (pdwMode && insert.aliasMatch == null) {
                                if (adminShow) {
                                    req.io.of('adminio').emit('messagePost', result);
                                } else {
                                    //do nothing
                                }
                            } else {
                                //Just emit - No Security enabled
                                req.io.of('adminio').emit('messagePost', result);
                                req.io.emit('messagePost', result);
                            }
                        }

                        res.status(200).send(result);
                    } else {
                        res.status(200).send('Ignoring filtered alias');
                    }
                }

            } else {
                res.status(500).json({message: 'Error - address or message missing'});
            }
        } catch (err) {
            logger.main.error(util.format('%o', err));
            res.status(500).send(err);
        }
    });

/**
 * GET message by id
 */
router.get('/messages/:id', async (req, res, next) => {
      nconf.load();

      const pdwMode = nconf.get('messages:pdwMode');

    try {
        console.time('sql');
        const queryResult = await Message.query()
            .findById(req.params.id)
            .eager('alias(messageView)')
            .modify('defaultSort')
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
        console.timeEnd('send');
    } catch (e) {
        console.time('send');
        res.status(500).send(err);
        console.timeEnd('send');
    }

});

/**
 * GET message search
 * */
router.get('/messageSearch', async (req, res, next) => {
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
        .modify('defaultSort')
        .joinEager('alias(messageView)')
        .modify(builder => {
            builder
                .where('alias.agency', 'LIKE', req.query.agency)
                .where('alias.address', 'LIKE', req.query.address)
                .where('alias.source', 'LIKE', req.query.address);

            if (req.query.q) {
                if (dbtype === 'mysql') builder.whereRaw('MATCH(message, address, source) AGAINST (? IN BOOLEAN MODE)', [req.query.q]);
                else if (dbtype === 'sqlite3') {
                    builder.join('messages_search_index', 'messages_search_index.rowid', 'messages.id').whereRaw('messages_search_index MATCH ?', [req.query.q]);
                }
            }

            if (!pdwMode || (adminShow && req.isAuthenticated()))
                builder.eagerOptions({joinOperator: 'left'});
            else
                builder.eagerOptions({joinOperator: 'inner'});
            if (hideCapcode && !req.isAuthenticated())
                builder.omit(['address']);
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
});


///////////////////
//               //
// Capcodes      //
//               //
///////////////////


// capcodes aren't pagified at the moment, this should probably be removed
router.get('/capcodes/init', (req, res, next) => {
  //set current page if specifed as get variable (eg: /?page=2)
  if (typeof req.query.page !== 'undefined') {
      const page = parseInt(req.query.page, 10);
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
        res.send(initData);
    })
    .catch((err) => {
      logger.main.error(err);
    })
});

// all capcode get methods are only used in admin area, so lock down to logged in users as they may contain sensitive data

/**
 * GET Capcodes listing
 * POST Capcode
 */
router.route('/capcodes')
    .get(async (req, res, next) => {
        try {
            const result = await Alias.query()
                .orderByRaw("REPLACE(address, '_', '%')");
            res.status(200).send(result);
        } catch (err) {
            res.status(500).send(err)
        }
    })
    .post(async (req, res, next) => {
        nconf.load();
        const updateRequired = nconf.get('database:aliasRefreshRequired');

        if (req.body.address && req.body.alias) {
            const data = {
                id: req.body.id || null,
                address: req.body.address || 0,
                alias: req.body.alias || 'null',
                agency: req.body.agency || 'null',
                color: req.body.color || 'black',
                icon: req.body.icon || 'question',
                ignore: req.body.ignore || 0,
                pluginconf: req.body.pluginconf || {}
            };

            try {
                const result = await Alias.query()
                    .findById(data.id)
                    .modify(builder => {
                        if (data.id == null)
                            builder.insert(data);
                        else
                            builder.update(data);
                    });

                res.status(200).send(result);
                if (!updateRequired || updateRequired === 0) {
                    nconf.set('database:aliasRefreshRequired', 1);
                    nconf.save();
                }
            } catch (err) {
                logger.main.error(err);
                res.status(500).send(err);
            }
            logger.main.debug(util.format('%o', req.body || 'no request body'));
        } else {
            res.status(500).send('Error - address or alias missing');
        }
    });

/**
 * GET Agency listing
 */
router.get('/capcodes/agency', async (req, res, next) => {
    try {
        const result = await Alias.query()
            .distinct('agency');
        res.status(200).send(result);
    }
    catch (err) {
        res.status(500).send(err);
    }
});

/**
 * GET Alias listing
 */
router.get('/capcodes/alias', async (req, res, next) => {
    try {
        const result = await Alias.query()
            .distinct('alias');
        res.status(200).send(result);
    }
    catch(err) {
        res.status(500).send(err);
    }
});

/**
 * GET Capcode by ID
 * POST Capcode by ID
 * DELETE Capcode by ID
 */
router.route('/capcodes/:capcode')
    .get(async (req, res, next) => {
        try {
            let result = await Alias.query()
                .findById(req.params.capcode);
            if (result === undefined) {
                result = {
                    id: "",
                    address: "",
                    alias: "",
                    agency: "",
                    icon: "question",
                    color: "black",
                    ignore: 0,
                    pluginconf: {}
                }
            }

            res.status(200).send(result);
        } catch(err) {
            res.status(500).send(err);
        }
    })
    .post(async (req, res, next) => {
        let id = req.params.capcode || req.body.id || null;

        nconf.load();
        const updateRequired = nconf.get('database:aliasRefreshRequired');
        let result;
        try {
            if (id === 'deleteMultiple') {
                // do delete multiple
                const idList = req.body.deleteList || [0, 0];
                if (!idList.some(isNaN)) {
                    logger.main.info('Deleting: ' + idList);

                    result = await Alias.query()
                        .delete()
                        .where('id', 'in', idList);
                } else
                    res.status(500).json({message: 'ID list contained non-numbers'}).send();
            } else {
                if (req.body.address && req.body.alias) {
                    if (id === 'new' || !id) {
                        id = null;
                    }

                    let insert = {};
                    insert.address = req.body.address || 0;
                    insert.alias = req.body.alias || 'null';
                    insert.agency = req.body.agency || 'null';
                    insert.color = req.body.color || 'black';
                    insert.icon = req.body.icon || 'question';
                    insert.ignore = req.body.ignore || 0;
                    insert.pluginconf = req.body.pluginconf || {};
                    const updateAlias = req.body.updateAlias || 0;

                    console.time('db');

                    const result = await Alias.query()
                        .modify(builder => {
                            if (id == null)
                                builder.insert(insert);
                            else
                                builder.findById(id).patch(insert);
                        });
                    console.timeEnd('db');

                    if (updateAlias) {
                        console.time('updateMap');
                        await Message.query()
                            .patch('alias_id', function () {
                                Alias.query()
                                    .select('id')
                                    .where('messages.address', 'like', 'address')
                                    .orderByRaw("REPLACE(address, '_', '%') DESC LIMIT 1")
                            });
                        console.timeEnd('updateMap');
                    } else if (!updateRequired || updateRequired === 0) {
                        nconf.set('database:aliasRefreshRequired', 1);
                        nconf.save();
                    }
                    logger.main.debug(util.format('%o', req.body || 'request body empty'));
                } else
                    res.status(500).json({message: 'Address or Alias missing'}).send();
            }

            console.time('send');
            res.status(200).send({'status': 'ok'});
            console.timeEnd('send');
            if (!updateRequired || updateRequired === 0) {
                nconf.set('database:aliasRefreshRequired', 1);
                nconf.save();
            }
        } catch (err) {
            res.status(500).json({message: err}).send();
        }
    })
    .delete(async (req, res, next) => {
        // delete single alias
        const id = parseInt(req.params.id, 10);
        nconf.load();
        const updateRequired = nconf.get('database:aliasRefreshRequired');
        logger.main.info('Deleting ' + id);

        try {
            console.time('delete');
            await Alias.query()
                .delete()
                .findById(id);
            console.timeEnd('delete');

            console.time('send');
            res.status(200).send({'status': 'ok'});
            if (!updateRequired || updateRequired === 0) {
                nconf.set('database:aliasRefreshRequired', 1);
                nconf.save();
            }
            console.timeEnd('send');
        } catch (err) {
            res.status(500).send(err);
        }
        logger.main.debug(util.format('%o', req.body || 'request body empty'));
    });

/**
 * GET CapcodeCheck
 */
router.get('/capcodeCheck/:address', async (req, res, next) => {
     try {
         let result = await Alias.query().findOne('address', req.params.address);
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

/**
 * GET Agency by Name
 */
router.get('/capcodes/agency/:agency', async (req, res, next) => {
    try {
        const result = await Alias.query()
            .where('agency', 'like', req.params.agency)
    }
    catch(err)
    {
        res.status(500).send(err);
    }
});

/**
 * POST CapcodeRefresh
 */
router.post('/capcodeRefresh', async (req, res, next) => {
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

// route middleware to make sure a user is logged in
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
