const express = require('express');
const _ = require('underscore');
const { InvalidRequestError, RequiredFieldMissingError } = require('../../helpers/errors');

const bcrypt = require('bcrypt');
const db = require('../../knex/knex');
const authHelper = require('../../middleware/authhelper');
const logger = require('../../log');

const router = express.Router();

/**
 * @typedef User
 * @property {Number} id The user's id
 * @property {string} username The user's unique username
 * @property {string} givenname The user's first name
 * @property {string} [surname] The user's last name
 * @property {string} email The user's email address
 * @property {"user"|"admin"} role The user's role
 * @property {"active"|"disabled"} status The user's status
 */

/**
 * Returns a single user object from the database
 * @param {false|Object} filter If false, an empty user object is returned
 * @param {User.id} filter.id The id of the user
 * @param {User.username} filter.username The users username
 * @param {User.email} filter.email The users email
 * @returns {User} The user object, an empty one if nothing was found.
 */
async function getSingleUser(filter) {
        const defaults = {
                username: '',
                password: '',
                givenname: '',
                surname: '',
                email: '',
                role: 'user',
                status: 'active',
        };
        if (!filter) return defaults;

        const filterCleaned = _.pick(filter, ['id', 'username', 'email']);
        const user = await db.from('users').select('*').where(filterCleaned).first();

        return user || defaults;
}

/**
 * Updates or creates a capcode in the database
 * @param {User} user The capcode object to be inserted or updated
 * @returns {User} The capcode object with the id set
 */
async function modifyUser(user) {
        const update = typeof user?.id === 'number';

        const insertion = _.defaults(user, {
                surname: '',
                role: 'user',
                status: 'disabled',
        });

        if (insertion.password) {
                const salt = await bcrypt.genSalt();
                const hash = await bcrypt.hash(user.password, salt);
                insertion.password = hash;
        }

        const insertResult = await db
                .from('users')
                .modify((qb) => {
                        if (update) qb.update(insertion).where('id', '=', insertion.id);
                        else qb.insert(insertion);
                })
                .returning('id');

        if (!update) user.id = insertResult[0].id;

        return user;
}

router.route('/user')
        .get(authHelper.isAdmin, async function (req, res, next) {
                try {
                        const users = await db
                                .from('users')
                                .select(
                                        'id',
                                        'givenname',
                                        'surname',
                                        'username',
                                        'email',
                                        'role',
                                        'status',
                                        'lastlogondate'
                                );
                        res.json(users);
                } catch (error) {
                        next(error);
                }
        })
        .post(authHelper.isAdmin, async function (req, res, next) {
                try {
                        if (!req.body.username) throw new RequiredFieldMissingError('username');
                        if (!req.body.email) throw new RequiredFieldMissingError('email');
                        if (!req.body.givenname) throw new RequiredFieldMissingError('givenname');
                        if (!req.body.password) throw new RequiredFieldMissingError('password');
                        if (!req.body.status) throw new RequiredFieldMissingError('status');
                        if (!req.body.role) throw new RequiredFieldMissingError('role');

                        const { username, email } = req.body;

                        const existingUser = await db
                                .table('users')
                                .where('username', '=', username)
                                .orWhere('email', '=', email)
                                .first();

                        if (existingUser) {
                                // TODO: switch to Error handling, we need to get the responses uniform...
                                // add logging
                                return res.status(400).send({
                                        status: 'error',
                                        error: 'Username or Email exists',
                                });
                        }
                        const salt = bcrypt.genSaltSync();
                        const hash = bcrypt.hashSync(req.body.password, salt);

                        const insertedUser = await db('users')
                                .insert({
                                        username: req.body.username,
                                        password: hash,
                                        givenname: req.body.givenname,
                                        surname: req.body.surname,
                                        email: req.body.email,
                                        role: req.body.role,
                                        status: req.body.status,
                                        lastlogondate: null,
                                })
                                .returning('id');

                        // add logging
                        logger.main.debug(`created user id: ${insertedUser[0].id}`);
                        res.status(200).send({
                                status: 'ok',
                                id: insertedUser[0].id,
                        });
                } catch (error) {
                        next(error);
                }
        });

router.route('/user/:id')
        .get(authHelper.isAdmin, async function (req, res, next) {
                try {
                        const { id } = req.params;
                        if (id === 'new') return res.json(await getSingleUser(false));
                        return res.json(await getSingleUser({ id }));
                } catch (error) {
                        next(error);
                }
        })
        .post(authHelper.isAdmin, async function (req, res, next) {
                try {
                        const parsedId = req.params.id || req.body.id || null;
                        if (!parsedId) throw new RequiredFieldMissingError('id');
                        if (parsedId === 'deleteMultiple') {
                                // do delete multiple
                                const idList = req.body.deleteList;
                                if (!idList) throw new RequiredFieldMissingError('deleteList entries');
                                if (idList.some(isNaN)) throw new InvalidRequestError('Id list contained non-numbers');
                                // ADD CHECK TO NOT ALLOW DELETION OF USERID 1
                                logger.main.info(`Deleting: ${idList}`);
                                await db.from('users').del().where('id', 'in', idList);
                                return res.status(200).send({ status: 'ok' });
                        }

                        if (!req.body.username) throw new RequiredFieldMissingError('username');
                        if (!req.body.email) throw new RequiredFieldMissingError('email');
                        if (!req.body.givenname) throw new RequiredFieldMissingError('givenname');

                        // This should never be POST, but DELETE!

                        if (parsedId === 'new') {
                                // Password is a required field if this is a new account check for that
                                if (!req.body.password) throw new RequiredFieldMissingError('password');
                        }
                        const id = parsedId === 'new' ? null : parseInt(parsedId, 10);

                        const user = _.pick(req.body, ['username', 'givenname', 'surname', 'email', 'role', 'status']);

                        user.id = id;
                        const password = req.body.newpassword || req.body.password || null;
                        if (password) user.password = password;

                        const result = await modifyUser(user);

                        res.send({ status: 'ok', id: result.id });
                } catch (error) {
                        next(error);
                }
        })
        .delete(authHelper.isAdmin, async function (req, res, next) {
                try {
                        const id = parseInt(req.params.id, 10);
                        if (id === 1) throw new InvalidRequestError('User ID 1 is protected');

                        logger.main.info(`Deleting User ${id}`);
                        await db.from('users').del().where('id', id);

                        res.status(200).send({ status: 'ok' });
                } catch (error) {
                        next(error);
                }
        });

router.route('/userCheck/username/:username').get(authHelper.isAdmin, async function (req, res, next) {
        try {
                const { username } = req.params;
                const user = await getSingleUser({ username });
                res.send(user);
        } catch (error) {
                next(error);
        }
});

router.route('/userCheck/email/:email').get(authHelper.isAdmin, async function (req, res, next) {
        try {
                const { email } = req.params;
                const user = await getSingleUser({ email });
                res.send(user);
        } catch (error) {
                next(error);
        }
});

module.exports = { router };
