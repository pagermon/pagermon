const { Model } = require('objection');
const db = require('../knex/knex');


Model.knex(db);

class Alias extends Model {
    static get tableName () {
        return 'capcodes';
    }

    static get jsonAttributes () {
        return ['pluginconf'];
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
                builder.column('alias',
                    'agency',
                    'icon',
                    'color',
                    'ignore',
                    'pluginconf',
                    {aliasMatch: 'id'}
                ).omit(Alias,['id']);
            }
        };
    }
}

module.exports = { Alias };
