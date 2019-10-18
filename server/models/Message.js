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

    static get modifiers () {
        return {
            messageViewColumns(builder) {
                builder
                    .columns(['messages.*',
                        'alias.alias',
                        'alias.aliasMatch',
                        'alias.icon',
                        'alias.agency',
                        'alias.color',
                        'alias.ignore'])
                    .orderBy('timestamp','DESC')
            },
            messageViewLeft(builder) {
                builder
                    .leftJoinRelation('[alias(messageView)]')
                    .applyFilter('messageViewColumns')
            },
            messageViewInner(builder) {
                builder
                    .innerJoinRelation('[alias(messageView)]')
                    .applyFilter('messageViewColumns')
            }
        }
    }
}

module.exports = { Message };
