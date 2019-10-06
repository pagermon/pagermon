const { Model } = require('objection');
const db = require('../knex/knex');


Model.knex(db);

class Alias extends Model {
    static get tableName () {
        return 'capcodes';
    }

    static get relationMappings () {
        const { Message } = require('./Message');
        return {
            messages: {
                relation: Model.HasManyRelation,
                modelClass: Message,
                join: {
                    from: 'capcodes.id',
                    to: 'messages.alias_id'
                }
            }
        }
    }

    static get modifiers() {
        return {
            messageView(builder) {
                builder.select('capcodes.alias',
                    'capcodes.agency',
                    'capcodes.icon',
                    'capcodes.color',
                    'capcodes.ignore',
                    builder => {
                        builder.select('capcodes.id').as('aliasMatch')
                    }
                )
            }
        };
    }
}

module.exports = { Alias };
