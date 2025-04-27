const express = require('express');
const _ = require('underscore');
const { InvalidRequestError, RequiredFieldMissingError, ResourceNotFoundError } = require('../../helpers/errors');

const db = require('../../knex/knex');
const authHelper = require('../../middleware/authhelper');
const logger = require('../../log');
const nconf = require('nconf');
const converter = require('json-2-csv');

const router = express.Router();

/**
 * @typedef Capcode
 * @property {Number} id The id of the capcode
 * @property {string} address The address of the capcode, can contain the wildcars _ and *
 * @property {string} alias The human readable alias of the capcode
 * @property {string} agency The agency this capcode belongs to
 * @property {string} color The color of the capcode, used for display in GUI
 * @property {string} icon The icon of the capcode, used for display in GUI
 * @property {number} ignore Wether to ignore messages belonging to this capcode - They won't be saved in the database
 * @property {Object} pluginconf The plugin configuration of the capcode - Contains a key for each plugin, holding the configuration for this plugin regarding this capcode
 * @property {boolean} onlyShowLoggedIn Whether messages of this capcode should only be shown to logged in users
 */

/**
 * Returns a single capcode object from the database
 * @param {false|Object} filter If false, an empty capcode object is returned
 * @param {string} filter.id The id of the capcode
 * @param {string} filter.address The address of the capcode
 * @returns {Capcode} The capcode object, an empty one if nothing was found.
 */
async function getSingleCapcode(filter) {
        const defaults = {
                id: '',
                address: '',
                alias: '',
                agency: '',
                icon: 'question',
                color: 'black',
                ignore: 0,
                pluginconf: {},
                onlyShowLoggedIn: 0,
        };
        if (!filter) return defaults;

        const filterCleaned = _.pick(filter, ['id', 'address']);
        const capcode = await db.from('capcodes').select('*').where(filterCleaned).first();

        if (!capcode) return defaults;

        capcode.pluginconf = parseJSON(capcode.pluginconf);
        return capcode;
}

/**
 * Returns all capcode objects from the database
 * @param {false|Object} filter If false, an empty capcode object is returned
 * @param {string} filter.id The id of the capcode
 * @param {string} filter.address The address of the capcode
 * @returns {Capcode} The capcode object, an empty one if nothing was found.
 */
async function getAllCapcodes(modifier) {
        const capcodes = await db
                .from('capcodes')
                .select('*')
                .modify((qb) => {
                        if (modifier) modifier(qb);
                });

        return capcodes.map((capcode) => {
                capcode.pluginconf = parseJSON(capcode.pluginconf);
                return capcode;
        });
}

/**
 * Updates or creates a capcode in the database
 * @param {Capcode} capcode The capcode object to be inserted or updated
 * @returns {Capcode} The capcode object with the id set
 */
async function modifyCapcode(capcode) {
        const pluginConfig = capcode.pluginconf;
        capcode.pluginconf = JSON.stringify(vaccumPluginConf(capcode.pluginconf)) || '{}';
        const update = typeof capcode?.id === 'number';

        const insertion = _.defaults(capcode, {
                address: '',
                alias: '',
                agency: '',
                color: 'black',
                icon: 'question',
                ignore: 0,
                pluginconf: {},
                onlyShowLoggedIn: false,
        });

        const insertResult = await db
                .from('capcodes')
                .modify((qb) => {
                        if (update) qb.update(insertion).where('id', '=', insertion.id);
                        else qb.insert(insertion);
                })
                .returning('id');

        if (!update) capcode.id = insertResult[0].id;
        capcode.pluginconf = pluginConfig;

        return capcode;
        // TODO: Capcode update!
}

/**
 * Refreshes all messages-to-capcode relations in the database.
 * @param {Object} filter The filter object to use for the refresh. All filters are combined with OR!
 * @param {string[]} filter.addresses The addresses that messages must match in order to be updated
 * @param {number[]} filter.ids The ids of the capcodes whose messages must be refreshed
 * @returns {Promise} A promise that resolves when the alias refresh is complete
 */
async function performCapcodeRefresh(filter) {
        await db('messages')
                .modify((qb) => {
                        if (filter?.addresses)
                                filter.addresses.forEach((address) => {
                                        qb.orWhere('messages.address', 'like', address);
                                });

                        if (filter?.ids) qb.orWhereIn('messages.alias_id', filter.ids);
                })
                .update('alias_id', function () {
                        this.select('id')
                                .from('capcodes')
                                .where('messages.address', 'like', 'capcodes.address')
                                .orderByRaw(`REPLACE(??, '_', '%') DESC`, 'capcodes.address')
                                .limit(1);
                });
}

// TODO: Get it into a helpers library
/**
 * Parses a JSON string and returns the object or null
 * @param {string} json The JSON string to parse
 * @returns {Object|null} The parsed object or null if an error occurred
 */
function parseJSON(json) {
        try {
                return JSON.parse(json);
        } catch (error) {
                // ignore errors
                logger.main.error(`Error while parsing json ${json}: ${error.message}`);
        }
}

/**
 * Removes all empty objects from a plugin configuration
 * @param {Object} pconf An object containing a key for each Plugin, holding it's configuration
 * @returns A sanitized version of the plugin configuration object holding only plugins with values set
 */
function vaccumPluginConf(pconf) {
        const cleaned = _.pick(pconf, (p) => Object.keys(p).length > 0);
        return cleaned;
}

router.route('/capcodes')
        .get(authHelper.isAdmin, async function (req, res, next) {
                try {
                        const capcodes = await db
                                .from('capcodes')
                                .select('*')
                                .orderByRaw(`REPLACE(??, ?, ?)`, ['address', '_', '%']);

                        res.json(capcodes);
                } catch (e) {
                        next(e);
                }
        })
        .post(authHelper.isAdmin, async function (req, res, next) {
                try {
                        if (!req.body.address) throw new RequiredFieldMissingError('address');
                        if (!req.body.alias) throw new RequiredFieldMissingError('alias');

                        const id = req.body.id || null;

                        const capcode = _.pick(req.body, [
                                'address',
                                'alias',
                                'agency',
                                'color',
                                'icon',
                                'ignore',
                                'pluginconf',
                                'onlyShowLoggedIn',
                        ]);

                        const filter = {
                                addresses: [req.body.address],
                        };

                        if (id !== 'new' && id !== null) {
                                capcode.id = id;
                                filter.ids = [id];

                                const oldCapcode = await getSingleCapcode({ id });
                                filter.addresses.push(oldCapcode.address);
                        }

                        const inserted = await modifyCapcode(capcode);

                        // Check if we can refresh just this specific alias
                        const specificRefresh = nconf.get('global:SpecificAliasRefresh');
                        if (specificRefresh) {
                                performCapcodeRefresh(filter);
                        } else {
                                // We cannot update this specific Alias, so inform of required Alias Refresh
                                nconf.set('database:aliasRefreshRequired', 1);
                                nconf.save();
                        }

                        res.json(inserted); // TODO: consistency to POST /capcodes/:id
                } catch (e) {
                        next(e);
                }
        });

// TODO: Should maybe better be an individual route
router.route('/capcodes/agency').get(authHelper.isAdmin, async function (req, res, next) {
        try {
                const agencies = await db.from('capcodes').distinct('agency');
                res.json(agencies);
        } catch (e) {
                next(e);
        }
});

router.route('/capcodes/agency/:agency').get(authHelper.isAdmin, async function (req, res, next) {
        try {
                const { agency } = req.params;
                const capcodes = (await db.from('capcodes').select('*').where({ agency })).map((capcode) => {
                        capcode.pluginconf = parseJSON(capcode.pluginconf);
                        return capcode;
                });
                res.json(capcodes);
        } catch (e) {
                next(e);
        }
});

router.route('/capcodes/:id')
        .get(authHelper.isAdmin, async function (req, res, next) {
                try {
                        const { id } = req.params;
                        res.json(await getSingleCapcode(id === 'new' ? false : { id }));
                } catch (e) {
                        next(e);
                }
        })
        .post(authHelper.isAdmin, async function (req, res, next) {
                // TODO: Add tests!
                try {
                        const id = req.params.id || req.body.id || null;
                        const updateAlias = req.body.updateAlias || 0; // TODO: We don't seem to set this anywhere. Seems like it would be better to check if the alias exists instead

                        // TODO: Deleting should not be a POST request, but a DELETE request
                        if (id === 'deleteMultiple') {
                                const idList = req.body.deleteList;
                                if (idList.length === 0) throw RequiredFieldMissingError('deleteList entries');
                                if (idList.some(isNaN)) throw InvalidRequestError('Id list contained non-numbers');

                                logger.main.info(`Deleting: ${idList}`);
                                await db.from('capcodes').del().where('id', 'in', idList);

                                nconf.set('database:aliasRefreshRequired', 1);
                                nconf.save();

                                return res.status(200).send({ status: 'ok' });
                        }
                        if (!req.body.addres || !req.body.alias)
                                throw new InvalidRequestError('Error - address or alias missing');

                        const capcode = _.pick(req.body, [
                                'address',
                                'alias',
                                'agency',
                                'color',
                                'icon',
                                'ignore',
                                'pluginconf',
                                'onlyShowLoggedIn',
                        ]);

                        const filter = {
                                addresses: [req.body.address],
                        };

                        if (id !== 'new' && id !== null) {
                                capcode.id = id;
                                filter.ids = [id];

                                const oldCapcode = await getSingleCapcode({ id });
                                filter.addresses.push(oldCapcode.address);
                        }

                        const inserted = await modifyCapcode(capcode);

                        if (updateAlias === 1) {
                                performCapcodeRefresh();
                        } else if (nconf.get('global:SpecificAliasRefresh')) {
                                performCapcodeRefresh(filter);
                        } else {
                                // We cannot update this specific Alias, so inform of required Alias Refresh
                                nconf.set('database:aliasRefreshRequired', 1);
                                nconf.save();
                        }
                        res.status(200).send({ status: 'ok', id: inserted.id }); // TODO: consistency to POST /capcodes/
                } catch (e) {
                        next(e);
                }
        })
        .delete(authHelper.isAdmin, async function (req, res, next) {
                try {
                        if (!req.params.id) throw new RequiredFieldMissingError('capcode id');
                        const { id } = req.params;
                        logger.main.debug(`Deleting capcode ${id}`);

                        const capcode = await getSingleCapcode({ id });

                        if (!capcode) throw new ResourceNotFoundError('Capcode not found');

                        await db.from('capcodes').del().where('id', req.params.id);

                        res.status(200).send({ status: 'ok' });
                        performCapcodeRefresh({ ids: [req.params.id], addresses: [capcode.address] }).then();
                } catch (e) {
                        next(e);
                }
        });

router.route('/capcodeCheck/:address').get(authHelper.isAdmin, async function (req, res, next) {
        try {
                const { address } = req.params;
                res.json(await getSingleCapcode({ address }));
        } catch (e) {
                next(e);
        }
});

// TODO: Add tests
router.route('/capcodeRefresh').post(authHelper.isAdmin, async function (req, res, next) {
        try {
                await performCapcodeRefresh();
                nconf.set('database:aliasRefreshRequired', 0);
                nconf.save();
                res.status(200).send({ status: 'ok' });
        } catch (error) {
                next(error);
        }
});

// TODO: This should be a GET request!
router.route('/capcodeExport').post(authHelper.isAdmin, async function (req, res, next) {
        try {
                const capcodes = await getAllCapcodes((qb) => {
                        qb.orderByRaw(`REPLACE(??, ?, ?)`, ['address', '_', '%']);
                });
                const data = await converter.json2csv(capcodes);
                res.send({ status: 'ok', data });
        } catch (error) {
                next(error);
        }
});

// TODO: Add tests
router.route('/capcodeImport').post(authHelper.isAdmin, async function (req, res, next) {
        try {
                // remove newline chars from dataset - yes i realise we are adding them in admin.main.js, it doesn't submit without them.
                const withoutNewLines = req.body.keys.map((key) => req.body[key].replace(/[\r\n]/g, ''));

                // join data but remove the last newline to prevent the last one being malformed.
                const importData = withoutNewLines.join('\n').slice(0, -1);

                const data = await converter.csv2jsonAsync(importData);

                // this checks if the csv has the required headings, should replace this with some form of proper validation
                const header = data[0];
                if (!('address' in header && 'alias' in header))
                        throw new InvalidRequestError('Invalid CSV file provided');
                const filter = {
                        ids: [],
                        addresses: [],
                };

                const importResults = await Promise.all(
                        data.map(async (capcode) => {
                                if (!capcode.address || !capcode.alias) {
                                        return Promise.resolve({
                                                address: capcode.address,
                                                alias: capcode.alias,
                                                result: 'failed - missing address or alias',
                                        });
                                }
                                filter.addresses.push(capcode.address);

                                const existingAlias = await db('capcodes')
                                        .returning('id')
                                        .where('address', '=', capcode.address)
                                        .first();

                                const operation = existingAlias ? 'updated' : 'created';
                                if (existingAlias) {
                                        capcode.id = existingAlias.id;
                                        filter.addresses.push(existingAlias.address);
                                }

                                try {
                                        const newCapcode = await modifyCapcode(capcode);
                                        filter.ids.push(newCapcode.id);

                                        return Promise.resolve({
                                                address: capcode.address,
                                                alias: capcode.alias,
                                                result: operation,
                                        });
                                } catch (error) {
                                        logger.main.error(
                                                `Error while importing capcode ${capcode.address}: ${error.message}`
                                        );
                                        return Promise.resolve({
                                                address: capcode.address,
                                                alias: capcode.alias,
                                                result: 'failed',
                                        });
                                }
                        })
                );

                // Gather all the results, format for the frontend and send it back.
                const results = { results: importResults };
                res.json(results);
                logger.main.debug(`Import: ${JSON.stringify(importResults)}`);
                performCapcodeRefresh(filter);
        } catch (error) {
                next(error);
        }
});

module.exports = { router, performCapcodeRefresh };
