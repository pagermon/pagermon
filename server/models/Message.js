const { Model } = require('objection');
const db = require('../knex/knex');
const {Alias} = require('./Alias');

Model.knex(db);


class Message extends Model {
    static get tableName () {
        return 'messages';
    }

    static get relationMappings () {
        return {
            alias: {
                relation: Model.BelongsToOneRelation,
                modelClass: Alias,
                join: {
                    from: 'messages.alias_id',
                    to: 'capcodes.id'
                }
            }
        }
    }
}

module.exports = { Message };
