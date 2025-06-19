const nconf = require('nconf');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 * */

/**
 * SQLITE does not allow tables to be renamed, if a trigger has a foreign key relation to them.
 * Therefore, we have to temporarily delete the triggers and re-install them after doing the migration.
 */

const up = async function(knex) {
        const isSqLite = nconf.get('database:type') === 'sqlite3';
        let triggers;
        if (isSqLite) {
                triggers = await knex
                        .from('sqlite_master')
                        .select(['name', 'sql'])
                        .where('type', 'trigger');

                const promises = triggers.map(trigger => knex.raw(`DROP TRIGGER ${trigger.name}`));

                await Promise.all(promises);
        }
        if (!(await knex.schema.hasTable('capcodes')))
                return Promise((resolve, reject) => {
                        reject('Capcode table is missing!');
                });

        await knex.schema.alterTable('capcodes', table => {
                table.boolean('onlyShowLoggedIn').defaultTo(false);
        });

        await knex('capcodes').update({ onlyShowLoggedIn: false });

        if (isSqLite) {
                const promises = triggers.map(trigger => knex.raw(trigger.sql));
                await Promise.all(promises);
        }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const down = async function(knex) {
        const isSqLite = nconf.get('database:type') === 'sqlite3';
        let triggers;
        if (isSqLite) {
                triggers = await knex
                        .from('sqlite_master')
                        .select(['name', 'sql'])
                        .where('type', 'trigger');

                const promises = triggers.map(trigger => knex.raw(`DROP TRIGGER ${trigger.name}`));

                await Promise.all(promises);
        }

        await knex.schema.alterTable('capcodes', table => {
                table.dropColumn('onlyShowLoggedIn');
        });

        if (isSqLite) {
                const promises = triggers.map(trigger => knex.raw(trigger.sql));
                await Promise.all(promises);
        }
};

module.exports.up = up;
module.exports.down = down;
