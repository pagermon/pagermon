const express = require('express');
const nconf = require('nconf');
const util = require('util');
const { promisify } = require('node:util');
const _ = require('underscore');
const { RequiredFieldMissingError } = require('../../helpers/errors');

const authHelper = require('../../middleware/authhelper');
const db = require('../../knex/knex');
const logger = require('../../log');
const pluginHandler = require('../../plugins/pluginHandler');

const pluginHandlerHandle = pluginHandler.handle;

pluginHandlerHandle[promisify.custom] = (trigger, scope, data) =>
        new Promise((resolve) => {
                pluginHandlerHandle(trigger, scope, data, resolve);
        });

const handle = promisify(pluginHandlerHandle);

// Buffer for duplicate checking.
const duplicateBuffer = [];

function isMemoryDuplicate(data) {
        // If duplicate filtering is disabled, it's not a duplicate
        if (!nconf.get('messages:duplicateFiltering')) return false;

        // this is a bad solution and tech debt that will bite us in the ass if we ever go HA, but that's a problem for future me and that guy's a dick

        const dupeTime = nconf.get('messages:duplicateTime') || 0;
        const oldestAllowedTime = data.timestamp - dupeTime;
        // if duplicate filtering is enabled, we want to populate the message buffer and check for duplicates within the limits
        const matches = _.where(duplicateBuffer, { message: data.message, address: data.address });

        if (matches.length > 0) {
                // If we have matches and no dupe time limit, it is always a dupe
                if (dupeTime === 0) return true;

                // Else, check if it is 'young' enough to be a dupe
                const timeFind = _.find(matches, (possibleDupe) => possibleDupe.timestamp > oldestAllowedTime);
                if (timeFind) {
                        return true;
                }
        }

        // no matches, maintain the array
        const dupeLimit = nconf.get('messages:duplicateLimit') || 0;
        const dupeArrayLimit = dupeLimit === 0 ? 25 : dupeLimit;
        if (duplicateBuffer.length > dupeArrayLimit) {
                duplicateBuffer.shift();
        }

        // Add message to duplicate buffer.
        duplicateBuffer.push(_.pick(data, ['message', 'timestamp', 'address']));
        return false;
}

async function isDatabaseDuplicate(data) {
        // If duplicate filtering is disabled, it's not a duplicate
        if (!nconf.get('messages:duplicateFiltering')) return false;

        const dupeTime = nconf.get('messages:duplicateTime') || 0;
        const dupeLimit = nconf.get('messages:duplicateLimit') || 0;
        const timeDiff = data.timestamp - dupeTime;

        const matches = await db
                .from('messages')
                .select('id')
                .modify(function (queryBuilder) {
                        if (dupeLimit !== 0 && dupeTime !== 0) {
                                queryBuilder
                                        .where('id', 'in', function () {
                                                this.select('*')
                                                        // this wierd subquery is to keep mysql happy
                                                        .from(function () {
                                                                this.select('id')
                                                                        .from('messages')
                                                                        .where('timestamp', '>', timeDiff)
                                                                        .orderBy('id', 'desc')
                                                                        .limit(dupeLimit)
                                                                        .as('temp_tab');
                                                        });
                                        })
                                        .where('message', '=', data.message)
                                        .where('address', '=', data.address);
                        } else if (dupeLimit !== 0 && dupeTime === 0) {
                                queryBuilder
                                        .where('id', 'in', function () {
                                                this.select('id')
                                                        // this wierd subquery is to keep mysql happy
                                                        .from(function () {
                                                                this.select('id')
                                                                        .from('messages')
                                                                        .orderBy('id', 'desc')
                                                                        .limit(dupeLimit)
                                                                        .as('temp_tab');
                                                        });
                                        })
                                        .where('message', '=', data.message)
                                        .where('address', '=', data.address);
                        } else if (dupeLimit === 0 && dupeTime !== 0) {
                                queryBuilder
                                        .where('id', 'in', function () {
                                                this.select('id').from('messages').where('timestamp', '>', timeDiff);
                                        })
                                        .where('message', '=', data.message)
                                        .where('address', '=', data.address);
                        } else {
                                queryBuilder.where('message', '=', data.message).where('address', '=', data.address);
                        }
                });

        return matches.length !== 0;
}

function getMessageQuery(req) {
        const pdwMode = nconf.get('messages:pdwMode');
        const adminShow = nconf.get('messages:adminShow');
        const queryTemplate = db.from('messages').modify((queryBuilder) => {
                if (!req.isAuthenticated())
                        queryBuilder.where((qb) =>
                                qb.where('capcodes.onlyShowLoggedIn', false).orWhereNull('capcodes.onlyShowLoggedIn')
                        );

                if (pdwMode && !(adminShow && req.isAuthenticated() && req.user.role === 'admin')) {
                        queryBuilder
                                .innerJoin('capcodes', 'capcodes.id', '=', 'messages.alias_id')
                                .where('capcodes.ignore', 0);
                } else {
                        queryBuilder.leftJoin('capcodes', 'capcodes.id', '=', 'messages.alias_id').where((qb) => {
                                qb.where('capcodes.ignore', 0).orWhereNull('capcodes.ignore');
                        });
                }
        });
        return queryTemplate.clone();
}

const router = express.Router();

router.route('/messages')
        .get(authHelper.isLoggedInMessages, async function (req, res, next) {
                try {
                        const HideCapcode = nconf.get('messages:HideCapcode');

                        const maxLimit = nconf.get('messages:maxLimit');
                        const defaultLimit = nconf.get('messages:defaultLimit');

                        const replaceText = nconf.get('messages:replaceText');

                        const initData = {
                                limit: defaultLimit || 20,
                                replaceText,
                                currentPage: 0,
                                pageCount: 0,
                                msgCount: 0,
                                offset: 0,
                        };

                        const parsePage = typeof req.query.page !== 'undefined' ? parseInt(req.query.page, 10) : 0;
                        initData.currentPage = parsePage > 0 ? parsePage - 1 : 0;

                        if (req.query.limit && req.query.limit <= maxLimit) {
                                initData.limit = parseInt(req.query.limit, 10);
                        } else {
                                initData.limit = parseInt(defaultLimit, 10);
                        }

                        const initCount = await getMessageQuery(req).count('* as msgcount');

                        const count = initCount[0].msgcount;
                        if (count === undefined) throw new Error('Something went really really wrong!'); // TODO: How the fuck would we end up in this situation?

                        initData.msgCount = count;

                        initData.pageCount = Math.ceil(initData.msgCount / initData.limit);
                        initData.currentPage = initData.currentPage > initData.pageCount ? 0 : initData.currentPage;

                        const offset = initData.limit * initData.currentPage;
                        initData.offset = offset > 0 ? offset : 0;

                        initData.offsetEnd = initData.offset + initData.limit;

                        const fields = [
                                'messages.id',
                                'messages.message',
                                'messages.timestamp',
                                'messages.timestamp as datetime',
                                'capcodes.alias',
                                'capcodes.agency',
                                'capcodes.icon',
                                'capcodes.color',
                        ];

                        if (!nconf.get('messages:HideSource') || (req.isAuthenticated() && req.user.role === 'admin'))
                                fields.push('messages.source');

                        if (!HideCapcode || req.isAuthenticated()) fields.push('messages.address');

                        if (req.isAuthenticated() && req.user.role === 'admin')
                                fields.push(
                                        db.raw(
                                                'CASE WHEN NOT capcodes.address = messages.address THEN 1 ELSE 0 END as wildcard'
                                        )
                                );

                        const messages = await getMessageQuery(req)
                                .select(fields)
                                .orderBy('messages.timestamp', 'desc')
                                .limit(initData.limit)
                                .offset(initData.offset);

                        res.status(200).json({ init: initData, messages });
                } catch (e) {
                        next(e);
                }
        })
        .post(authHelper.isAdmin, async function (req, res, next) {
                try {
                        if (!req.body.address) throw new RequiredFieldMissingError('address');
                        if (!req.body.message) throw new RequiredFieldMissingError('message');

                        const dbtype = nconf.get('database:type');

                        let data = _.pick(req.body, ['address', 'message', 'timestamp', 'source', 'datetime']);
                        data.pluginData = {};

                        if (isMemoryDuplicate(data)) {
                                logger.main.info(util.format('Ignoring memory duplicate: %o', data));
                                return res.status(200).send('Ignoring duplicate');
                        }

                        if (!data.timestamp && data.datetime)
                                logger.main.warn(
                                        `Deprecation notice: An incoming message from ${
                                                data.source || 'an unknown source'
                                        }
                                contains the timestamp as field 'datetime'. The field datetime will be removed from future versions.
                                Update the message source to use the variable 'timestamp' instead.`
                                );
                        data.timestamp = data.timestamp || data.datetime || Date.now();

                        // send data to pluginHandler before proceeding
                        logger.main.debug('beforeMessage start');

                        const pluginBeforeResponse = await handle('message', 'before', data);

                        logger.main.debug(util.format('%o', pluginBeforeResponse));
                        logger.main.debug('beforeMessage done');

                        if (pluginBeforeResponse && pluginBeforeResponse.pluginData)
                                // only set data to the response if it's non-empty and still contains the pluginData object
                                data = pluginBeforeResponse;

                        if (data.pluginData.ignore) {
                                // stop processing
                                logger.main.info(util.format('Ignoring filtered capcode: %o', data));
                                return res.status(200).send('Ignoring filtered');
                        }
                        data.address = data.address || '0000000';
                        data.message = data.message || 'null';
                        data.source = data.source || 'UNK';

                        if (await isDatabaseDuplicate(data)) {
                                logger.main.info(util.format('Ignoring database duplicate: %o', data));
                                return res.status(200).send('Ignoring duplicate');
                        }

                        const capcode = await db
                                .from('capcodes')
                                .select('id', 'ignore')
                                .whereRaw(`? LIKE ??`, [data.address, 'address'])
                                .orderByRaw(`REPLACE("address", '_', '%') DESC`)
                                .first();

                        const ignore = capcode ? capcode.ignore : false;
                        if (ignore) {
                                logger.main.info(`Ignoring filtered address: ${data.address} alias: ${capcode.id}`);
                                return res.status(200).send('Ignoring filtered');
                        }

                        if (data.pluginData.aliasID) data.alias_id = data.pluginData.aliasID;
                        else if (capcode) data.alias_id = capcode.id;
                        else data.alias_id = null;

                        const messageId = (
                                await db('messages')
                                        .insert(_.pick(data, ['address', 'message', 'timestamp', 'source', 'alias_id']))
                                        .returning('id')
                        )[0].id;

                        if (dbtype === 'oracledb') {
                                // oracle requires update of search index after insert, can't be trigger for some reason
                                db.raw(`BEGIN CTX_DDL.SYNC_INDEX('search_idx'); END;`)
                                        .then((resp) => {
                                                logger.main.debug('search_idx sync complete');
                                                logger.main.debug(resp);
                                        })
                                        .catch((err) => {
                                                logger.main.error('search_idx sync failed');
                                                logger.main.error(err);
                                        });
                        }

                        const insertedMessage = await db
                                .from('messages')
                                .select(
                                        'messages.*',
                                        'capcodes.alias',
                                        'capcodes.address as capcodeAddress',
                                        'capcodes.agency',
                                        'capcodes.icon',
                                        'capcodes.color',
                                        'capcodes.ignore',
                                        'capcodes.pluginconf',
                                        'capcodes.onlyShowLoggedIn'
                                )
                                .modify(function (queryBuilder) {
                                        queryBuilder.leftJoin('capcodes', 'capcodes.id', '=', 'messages.alias_id');
                                })
                                .where('messages.id', '=', messageId);

                        // Copy timestamp to datetime for backwards compatibility.
                        insertedMessage.datetime = insertedMessage.timestamp;

                        // send data to pluginHandler after processing
                        insertedMessage.pluginData = data.pluginData;
                        insertedMessage.pluginconf = parseJSON(insertedMessage.pluginconf) || {};
                        insertedMessage.wildcard = insertedMessage.address !== insertedMessage.capcodeAddress;

                        logger.main.debug('afterMessage start');

                        const messageAfterResponse = await handle('message', 'after', insertedMessage);

                        logger.main.debug(util.format('%o', messageAfterResponse));
                        logger.main.debug('afterMessage done');

                        // remove the pluginconf object before firing socket message
                        delete insertedMessage.pluginconf;
                        const fields = [
                                'id',
                                'message',
                                'timestamp',
                                'datetime',
                                'alias_id',
                                'alias',
                                'agency',
                                'icon',
                                'color',
                        ];

                        if (!nconf.get('messages:HideCapcode')) fields.push('address'); // Show address, when hideCapcode is off.
                        if (!nconf.get('messages:HideSource')) fields.push('source'); // Likewise with source.

                        const pdwMode = nconf.get('messages:pdwMode');
                        const adminShow = nconf.get('messages:adminShow');
                        const rowUser = _.pick(insertedMessage, fields);

                        /*
                                  If:
                                  - The admin has no alias
                                  - And pdw mode is on
                                  -> Do not send to users
                                  -> If
                                    - AdminShow is on
                                    -> Do send to admins though
                                */
                        if (!pdwMode || insertedMessage.alias_id !== null) {
                                req.io.to('admin').emit('messagePost', insertedMessage);
                                req.io.to('user').emit('messagePost', rowUser);
                                if (!insertedMessage.onlyShowLoggedIn)
                                        req.io.to('anonymous').emit('messagePost', rowUser);
                        } else if (insertedMessage.alias_id === null) {
                                if (adminShow) req.io.to('admin').emit('messagePost', insertedMessage);
                        }

                        res.status(200).send(`${messageId}`);
                } catch (e) {
                        next(e);
                }
        });

router.route('/messages/:messageId').get(authHelper.isLoggedInMessages, async function (req, res, next) {
        try {
                const messageId = parseInt(req.params.messageId, 10);
                const HideCapcode = nconf.get('messages:HideCapcode');

                const fields = [
                        'messages.id',
                        'messages.message',
                        'messages.timestamp',
                        'messages.timestamp as datetime',
                        'capcodes.alias',
                        'capcodes.agency',
                        'capcodes.icon',
                        'capcodes.color',
                ];

                if (!nconf.get('messages:HideSource') || (req.isAuthenticated() && req.user.role === 'admin'))
                        fields.push('messages.source');

                if (!HideCapcode || req.isAuthenticated()) fields.push('messages.address');

                if (req.isAuthenticated() && req.user.role === 'admin')
                        fields.push(
                                db.raw(
                                        'CASE WHEN NOT capcodes.address = messages.address THEN 1 ELSE 0 END as wildcard'
                                )
                        );

                const message = await getMessageQuery(req).select(fields).where('messages.id', messageId).first();

                res.status(200).json(message || {});
        } catch (e) {
                next(e);
        }
});

router.route('/messageSearch').get(authHelper.isLoggedInMessages, async function (req, res, next) {
        try {
                const HideCapcode = nconf.get('messages:HideCapcode');
                const dbtype = nconf.get('database:type');

                const maxLimit = nconf.get('messages:maxLimit');
                const defaultLimit = nconf.get('messages:defaultLimit');

                const replaceText = nconf.get('messages:replaceText');

                const initData = {
                        limit: defaultLimit || 20,
                        replaceText,
                        currentPage: 0,
                        pageCount: 0,
                        msgCount: 0,
                        offset: 0,
                };

                const parsePage = typeof req.query.page !== 'undefined' ? parseInt(req.query.page, 10) : 0;
                initData.currentPage = parsePage > 0 ? parsePage - 1 : 0;

                if (req.query.limit && req.query.limit <= maxLimit) {
                        initData.limit = parseInt(req.query.limit, 10);
                } else {
                        initData.limit = parseInt(defaultLimit, 10);
                }

                const { q: query, agency, address, alias } = req.query;

                const fields = [
                        'messages.id',
                        'messages.message',
                        'messages.timestamp',
                        'messages.timestamp as datetime',
                        'capcodes.alias',
                        'capcodes.agency',
                        'capcodes.icon',
                        'capcodes.color',
                ];

                if (!nconf.get('messages:HideSource') || (req.isAuthenticated() && req.user.role === 'admin'))
                        fields.push('messages.source');

                if (!HideCapcode || req.isAuthenticated()) fields.push('messages.address');

                if (req.isAuthenticated() && req.user.role === 'admin')
                        fields.push(
                                db.raw(
                                        'CASE WHEN NOT capcodes.address = messages.address THEN 1 ELSE 0 END as wildcard'
                                )
                        );

                const messages = await getMessageQuery(req)
                        .select(fields)
                        .modify(function (qb) {
                                if (query)
                                        switch (dbtype) {
                                                case 'sqlite3':
                                                        qb.whereIn(
                                                                'messages.id',
                                                                db
                                                                        .from('messages_search_index')
                                                                        .select('rowid')
                                                                        .whereRaw(
                                                                                'messages_search_index MATCH ?',
                                                                                query
                                                                        )
                                                        );

                                                        break;
                                                case 'mysql':
                                                        qb.whereRaw(
                                                                `MATCH(messages.message, messages.address, messages.source) AGAINST (? IN BOOLEAN MODE)`,
                                                                `"${query}"`
                                                        );
                                                        break;
                                                case 'oracledb':
                                                        qb.whereRaw(`CONTAINS("messages"."message", ?, 1) > 0`, query);
                                                        break;
                                                default:
                                                        break;
                                        }

                                if (address)
                                        qb.where((addressWhere) => {
                                                addressWhere
                                                        .where('messages.address', 'LIKE', address)
                                                        .orWhere('messages.source', address);
                                        });
                                if (agency)
                                        qb.where((agencyWhere) => {
                                                agencyWhere
                                                        .where('capcodes.agency', 'LIKE', `%${agency}%`)
                                                        .where('capcodes.ignore', false);
                                        });

                                if (alias) {
                                        if (alias === '-1') qb.whereNull('messages.alias_id');
                                        else qb.where('messages.alias_id', alias);
                                }
                        })
                        .orderBy('messages.timestamp', 'desc');

                if (!messages) logger.main.info('empty results');

                if (messages.length === 0) return res.status(200).json({ init: {}, messages: [] });

                // TODO: This is highly inefficient, because we need to check EVERY message, to only use a few
                initData.msgCount = messages.length;
                initData.pageCount = Math.ceil(initData.msgCount / initData.limit);
                if (initData.currentPage > initData.pageCount) {
                        initData.currentPage = 0;
                }
                initData.offset = initData.limit * initData.currentPage;
                if (initData.offset < 0) {
                        initData.offset = 0;
                }
                initData.offsetEnd = initData.offset + initData.limit;

                res.json({ init: initData, messages: messages.slice(initData.offset, initData.offsetEnd) });
        } catch (e) {
                next(e);
        }
});

// TODO: Get it into a helpers library
function parseJSON(json) {
        try {
                return JSON.parse(json);
        } catch (error) {
                // ignore errors
                logger.main.error(`Error while parsing json ${json}: ${error.message}`);
        }
}

module.exports = { router };
