process.env.NODE_ENV = 'test';

const chai = require('chai');

const chaiHttp = require('chai-http');

chai.use(chaiHttp);

const confFile = './config/config.json';
// load the config file
const nconf = require('nconf');

const server = require('../app');
const db = require('../knex/knex.js');

// This needs to be sorted out, use a different config file when testing?
const passportStub = require('passport-stub');

passportStub.install(server);

nconf.file({ file: confFile });
nconf.load();

beforeEach(() =>
        db.schema
                .hasTable('knex_migrations_lock')
                .then((exists) => {
                        if (exists) return db.del().from(`knex_migrations_lock`);
                })
                .then(() => db.migrate.rollback())
                .then(() => db.migrate.latest())
                .then(() => db.seed.run())
                .then(() => {
                        nconf.set('messages:HideSource', false);
                        nconf.set('messages:apiSecurity', false);
                        nconf.set('messages:HideCapcode', false);
                })
);

afterEach(() =>
        db.migrate.rollback().then(() => {
                passportStub.logout();
        })
);

describe('Database failures', () => {
        it('should return 500 if all tables are deleted', (done) => {
                db.migrate.rollback().then(() => {
                        chai.request(server)
                                .get('/api/messages/')
                                .end((err, res) => {
                                        res.should.have.status(500);
                                        res.body.should.have.property('error');
                                        res.body.error.should.be.an('object');
                                        res.body.error.should.have.property('message');
                                        res.body.error.message.should.contain('Internal Server Error');
                                        done();
                                });
                });
        });
        it('should return 500 if the database is not available', (done) => {
                /* eslint-disable no-console */
                // Simulate a database connection error and silence the error message
                const originalConsoleError = console.error;
                const originalKnexLogger = db.client.logger;

                console.error = () => {};
                db.client.logger = { error: () => {} };
                const originalAcquire = db.client.pool.acquire;
                db.client.pool.acquire = () => Promise.reject(new Error('Connection refused'));

                chai.request(server)
                        .get('/api/messages/')
                        .end((err, res) => {
                                // Restore original pool immediately after assertion
                                db.client.pool.acquire = originalAcquire;
                                console.error = originalConsoleError;
                                db.client.logger = originalKnexLogger;

                                res.should.have.status(500);
                                res.body.should.have.property('error');
                                res.body.error.should.be.an('object');
                                res.body.error.should.have.property('message');
                                res.body.error.message.should.contain('Internal Server Error');
                                done();
                        });
                /* eslint-enable no-console */
        });
});
