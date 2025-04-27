const nconf = require('nconf');

exports.up = async function (db) {
        const exists = await db.schema.hasTable('users');
        if (exists) return 'Not Required';

        const dbtype = nconf.get('database:type');
        await db.schema.createTable('users', (table) => {
                if (dbtype === 'mysql') {
                        table.charset('utf8');
                        table.collate('utf8_general_ci');
                }
                table.increments('id').primary().unique().notNullable();
                table.string('givenname', [255]).notNullable();
                table.string('surname', [255]);
                table.string('username', [32]).notNullable().unique();
                table.string('password').notNullable();
                table.string('email').notNullable().unique();
                table.enu('role', ['admin', 'user']).notNullable().defaultTo('user');
                table.enu('status', ['active', 'disabled']).notNullable().defaultTo('disabled');
                table.datetime('lastlogondate');
        });

        const user = nconf.get('auth:user');
        const pwd = nconf.get('auth:encPass');

        // Migrate the current admin user.
        return db('users').insert({
                givenname: 'Admin',
                surname: '',
                username: user,
                password: pwd,
                email: 'none@none.com',
                role: 'admin',
                status: 'active',
                lastlogondate: null,
        });
};

exports.down = async function (db) {
        // Write the admin user with the lowest id to the config file, assuming he was the original one.
        const admin = await db
                .from('users')
                .select('username', 'password')
                .where({ role: 'admin' })
                .orderBy('id', 'asc')
                .first();
        nconf.set('auth:encPass', admin.password);
        nconf.set('auth:user', admin.username);
        return db.schema.dropTable('users');
};
