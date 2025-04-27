process.env.NODE_ENV = 'test';

const chai = require('chai');
const _ = require('underscore');

const should = chai.should();
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

const confFile = './config/config.json';
// load the config file
const nconf = require('nconf');

nconf.file({ file: confFile });
nconf.load();

const passportStub = require('passport-stub');

const server = require('../app');
const db = require('../knex/knex.js');

// This needs to be sorted out, use a different config file when testing?

passportStub.install(server);
// set required settings in config file

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
afterEach(() => db.migrate.rollback().then(() => passportStub.logout()));

describe('GET /api/capcodes', () => {
        it('should return all capcodes when logged in as admin', (done) => {
                passportStub.login({
                        username: 'adminactive',
                        password: 'changeme',
                        role: 'admin',
                });
                chai.request(server)
                        .get('/api/capcodes')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('array');
                                res.body[0].should.have.property('id');
                                res.body[0].should.have.property('address');
                                res.body[0].should.have.property('alias');
                                res.body[0].should.have.property('agency');
                                res.body[0].should.have.property('icon');
                                res.body[0].should.have.property('color');
                                res.body[0].should.have.property('pluginconf');
                                res.body[0].should.have.property('ignore');
                                res.body.length.should.eql(6);
                                done();
                        });
        });
        it('should return all capcodes when api key provided', (done) => {
                chai.request(server)
                        .get('/api/capcodes')
                        .set('apikey', 'reallylongkeythatneedstobechanged')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('array');
                                res.body[0].should.have.property('id');
                                res.body[0].should.have.property('address');
                                res.body[0].should.have.property('alias');
                                res.body[0].should.have.property('agency');
                                res.body[0].should.have.property('icon');
                                res.body[0].should.have.property('color');
                                res.body[0].should.have.property('pluginconf');
                                res.body[0].should.have.property('ignore');
                                res.body.length.should.eql(6);
                                done();
                        });
        });
        it('should return a 403 when not admin', (done) => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme',
                        role: 'user',
                });
                chai.request(server)
                        .get('/api/capcodes')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(403);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
        it('should return a 401 when not logged in', (done) => {
                chai.request(server)
                        .get('/api/capcodes')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
        it('should return a 401 when incorrect api key provided', (done) => {
                chai.request(server)
                        .get('/api/capcodes')
                        .set('apikey', 'shortkeythatdoesntexist')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
});

describe('POST /api/capcodes', () => {
        describe('update capcode', () => {
                it('should update a capcode when logged in as admin', (done) => {
                        passportStub.login({
                                username: 'adminactive',
                                password: 'changeme',
                                role: 'admin',
                        });
                        const capcode = {
                                id: 1,
                                address: '12345672',
                                alias: 'Newly updated',
                                agency: 'UPDATED',
                                icon: 'updated',
                                color: 'updated',
                                pluginconf: {
                                        plugin1: {
                                                enabled: true,
                                                config: {
                                                        setting1: 'value1',
                                                        setting2: 'value2',
                                                },
                                        },
                                        plugin2: {},
                                },
                                ignore: 0,
                                onlyShowLoggedIn: false,
                        };
                        chai.request(server)
                                .post('/api/capcodes')
                                .send(capcode)
                                .end((postErr, postRes) => {
                                        postRes.status.should.eql(200);
                                        postRes.body.should.have.property('id');
                                        postRes.body.id.should.eql(capcode.id);
                                        postRes.type.should.eql('application/json');
                                        chai.request(server)
                                                .get(`/api/capcodes/${capcode.id}`)
                                                .end((getErr, getRes) => {
                                                        getRes.status.should.eql(200);
                                                        getRes.type.should.eql('application/json');
                                                        getRes.body.should.be.a('object');
                                                        getRes.body.should.have.all.keys(capcode);
                                                        getRes.body.id.should.eql(capcode.id);
                                                        getRes.body.address.should.eql(capcode.address);
                                                        getRes.body.alias.should.eql(capcode.alias);
                                                        getRes.body.agency.should.eql(capcode.agency);
                                                        getRes.body.icon.should.eql(capcode.icon);
                                                        getRes.body.color.should.eql(capcode.color);
                                                        getRes.body.pluginconf.should.be.a('object'); // Plugin configuration can be changed by vacuum and is not necessarily the same as the one sent
                                                        getRes.body.pluginconf.should.have.property('plugin1');
                                                        getRes.body.pluginconf.plugin1.should.be.a('object');
                                                        getRes.body.pluginconf.plugin1.should.have.property('enabled');
                                                        getRes.body.pluginconf.plugin1.enabled.should.eql(
                                                                capcode.pluginconf.plugin1.enabled
                                                        );
                                                        getRes.body.pluginconf.plugin1.should.have.property('config');
                                                        getRes.body.pluginconf.plugin1.config.should.be.a('object');
                                                        getRes.body.pluginconf.plugin1.config.should.have.all.keys(
                                                                'setting1',
                                                                'setting2'
                                                        );
                                                        getRes.body.pluginconf.plugin1.config.setting1.should.eql(
                                                                capcode.pluginconf.plugin1.config.setting1
                                                        );
                                                        getRes.body.pluginconf.plugin1.config.setting2.should.eql(
                                                                capcode.pluginconf.plugin1.config.setting2
                                                        );
                                                        getRes.body.ignore.should.eql(capcode.ignore);
                                                        getRes.body.onlyShowLoggedIn.should.satisfy(
                                                                (val) => val == capcode.onlyShowLoggedIn
                                                        );
                                                        done();
                                                });
                                });
                });
                it('should update a capcode when api key provided', (done) => {
                        nconf.set('auth:keys', [
                                {
                                        name: 'example1',
                                        key: 'reallylongkeythatneedstobechanged',
                                        selected: false,
                                },
                                {
                                        name: 'example2',
                                        key: 'whydoyouneedtwokeys',
                                },
                        ]);
                        nconf.save();
                        const capcode = {
                                id: 1,
                                address: '12345672',
                                alias: 'Newly updated',
                                agency: 'UPDATED',
                                icon: 'updated',
                                color: 'updated',
                                pluginconf: {
                                        plugin1: {
                                                enabled: true,
                                                config: {
                                                        setting1: 'value1',
                                                        setting2: 'value2',
                                                },
                                        },
                                        plugin2: {},
                                },
                                ignore: 0,
                                onlyShowLoggedIn: false,
                        };
                        chai.request(server)
                                .post('/api/capcodes')
                                .set('apikey', 'reallylongkeythatneedstobechanged')
                                .send(capcode)
                                .end((postErr, postRes) => {
                                        postRes.status.should.eql(200);
                                        postRes.body.should.have.property('id');
                                        postRes.body.id.should.eql(capcode.id);
                                        postRes.type.should.eql('application/json');
                                        chai.request(server)
                                                .get(`/api/capcodes/${capcode.id}`)
                                                .set('apikey', 'reallylongkeythatneedstobechanged')
                                                .end((getErr, getRes) => {
                                                        getRes.status.should.eql(200);
                                                        getRes.type.should.eql('application/json');
                                                        getRes.body.should.be.a('object');
                                                        getRes.body.should.have.all.keys(capcode);
                                                        getRes.body.id.should.eql(capcode.id);
                                                        getRes.body.address.should.eql(capcode.address);
                                                        getRes.body.alias.should.eql(capcode.alias);
                                                        getRes.body.agency.should.eql(capcode.agency);
                                                        getRes.body.icon.should.eql(capcode.icon);
                                                        getRes.body.color.should.eql(capcode.color);
                                                        getRes.body.pluginconf.should.be.a('object'); // Plugin configuration can be changed by vacuum and is not necessarily the same as the one sent
                                                        getRes.body.pluginconf.should.have.property('plugin1');
                                                        getRes.body.pluginconf.plugin1.should.be.a('object');
                                                        getRes.body.pluginconf.plugin1.should.have.property('enabled');
                                                        getRes.body.pluginconf.plugin1.enabled.should.eql(
                                                                capcode.pluginconf.plugin1.enabled
                                                        );
                                                        getRes.body.pluginconf.plugin1.should.have.property('config');
                                                        getRes.body.pluginconf.plugin1.config.should.be.a('object');
                                                        getRes.body.pluginconf.plugin1.config.should.have.all.keys(
                                                                'setting1',
                                                                'setting2'
                                                        );
                                                        getRes.body.pluginconf.plugin1.config.setting1.should.eql(
                                                                capcode.pluginconf.plugin1.config.setting1
                                                        );
                                                        getRes.body.pluginconf.plugin1.config.setting2.should.eql(
                                                                capcode.pluginconf.plugin1.config.setting2
                                                        );
                                                        getRes.body.ignore.should.eql(capcode.ignore);
                                                        getRes.body.onlyShowLoggedIn.should.satisfy(
                                                                (val) => val == capcode.onlyShowLoggedIn
                                                        );
                                                        done();
                                                });
                                });
                });
        });
        describe('create capcode', () => {
                it('should create a new capcode when logged in as admin', (done) => {
                        passportStub.login({
                                username: 'adminactive',
                                password: 'changeme',
                                role: 'admin',
                        });
                        const capcode = {
                                address: '12345673',
                                alias: 'Newly created',
                                agency: 'CREATED',
                                icon: 'CREATED',
                                color: 'CREATED',
                                pluginconf: {
                                        plugin1: {
                                                enabled: true,
                                                config: {
                                                        setting1: 'value1',
                                                        setting2: 'value2',
                                                },
                                        },
                                        plugin2: {},
                                },
                                ignore: 0,
                                onlyShowLoggedIn: false,
                        };
                        chai.request(server)
                                .post('/api/capcodes')
                                .send(capcode)
                                .end((postErr, postRes) => {
                                        postRes.status.should.eql(200);
                                        postRes.body.should.have.property('id');
                                        const { id } = postRes.body;
                                        postRes.type.should.eql('application/json');
                                        chai.request(server)
                                                .get(`/api/capcodes/${id}`)
                                                .end((getErr, getRes) => {
                                                        getRes.status.should.eql(200);
                                                        getRes.type.should.eql('application/json');
                                                        getRes.body.should.be.a('object');
                                                        getRes.body.should.have.all.keys({ id, ...capcode });
                                                        getRes.body.id.should.eql(id);
                                                        getRes.body.address.should.eql(capcode.address);
                                                        getRes.body.alias.should.eql(capcode.alias);
                                                        getRes.body.agency.should.eql(capcode.agency);
                                                        getRes.body.icon.should.eql(capcode.icon);
                                                        getRes.body.color.should.eql(capcode.color);
                                                        getRes.body.pluginconf.should.be.a('object');
                                                        getRes.body.pluginconf.should.have.property('plugin1');
                                                        getRes.body.pluginconf.should.not.have.property('plugin2');
                                                        getRes.body.pluginconf.plugin1.should.be.a('object');
                                                        getRes.body.pluginconf.plugin1.should.have.property('enabled');
                                                        getRes.body.pluginconf.plugin1.enabled.should.eql(
                                                                capcode.pluginconf.plugin1.enabled
                                                        );
                                                        getRes.body.pluginconf.plugin1.should.have.property('config');
                                                        getRes.body.pluginconf.plugin1.config.should.be.a('object');
                                                        getRes.body.pluginconf.plugin1.config.should.have.all.keys(
                                                                'setting1',
                                                                'setting2'
                                                        );
                                                        getRes.body.pluginconf.plugin1.config.setting1.should.eql(
                                                                capcode.pluginconf.plugin1.config.setting1
                                                        );
                                                        getRes.body.pluginconf.plugin1.config.setting2.should.eql(
                                                                capcode.pluginconf.plugin1.config.setting2
                                                        );
                                                        getRes.body.ignore.should.eql(capcode.ignore);
                                                        getRes.body.onlyShowLoggedIn.should.satisfy(
                                                                (val) => val == capcode.onlyShowLoggedIn
                                                        );
                                                        done();
                                                });
                                });
                });
                it('should create a new capcode when api key provided', (done) => {
                        nconf.set('auth:keys', [
                                {
                                        name: 'example1',
                                        key: 'reallylongkeythatneedstobechanged',
                                        selected: false,
                                },
                                {
                                        name: 'example2',
                                        key: 'whydoyouneedtwokeys',
                                },
                        ]);
                        nconf.save();
                        const capcode = {
                                address: '12345673',
                                alias: 'Newly created',
                                agency: 'CREATED',
                                icon: 'CREATED',
                                color: 'CREATED',
                                pluginconf: {
                                        plugin1: {
                                                enabled: true,
                                                config: {
                                                        setting1: 'value1',
                                                        setting2: 'value2',
                                                },
                                        },
                                        plugin2: {},
                                },
                                ignore: 0,
                                onlyShowLoggedIn: false,
                        };
                        chai.request(server)
                                .post('/api/capcodes')
                                .set('apikey', 'reallylongkeythatneedstobechanged')
                                .send(capcode)
                                .end((postErr, postRes) => {
                                        postRes.status.should.eql(200);
                                        postRes.body.should.have.property('id');
                                        const { id } = postRes.body;
                                        postRes.type.should.eql('application/json');
                                        chai.request(server)
                                                .get(`/api/capcodes/${id}`)
                                                .set('apikey', 'reallylongkeythatneedstobechanged')
                                                .end((getErr, getRes) => {
                                                        getRes.status.should.eql(200);
                                                        getRes.type.should.eql('application/json');
                                                        getRes.body.should.be.a('object');
                                                        getRes.body.should.have.all.keys({ id, ...capcode });
                                                        getRes.body.id.should.eql(id);
                                                        getRes.body.address.should.eql(capcode.address);
                                                        getRes.body.alias.should.eql(capcode.alias);
                                                        getRes.body.agency.should.eql(capcode.agency);
                                                        getRes.body.icon.should.eql(capcode.icon);
                                                        getRes.body.color.should.eql(capcode.color);
                                                        getRes.body.pluginconf.should.be.a('object');
                                                        getRes.body.pluginconf.should.have.property('plugin1');
                                                        getRes.body.pluginconf.should.not.have.property('plugin2');
                                                        getRes.body.pluginconf.plugin1.should.be.a('object');
                                                        getRes.body.pluginconf.plugin1.should.have.property('enabled');
                                                        getRes.body.pluginconf.plugin1.enabled.should.eql(
                                                                capcode.pluginconf.plugin1.enabled
                                                        );
                                                        getRes.body.pluginconf.plugin1.should.have.property('config');
                                                        getRes.body.pluginconf.plugin1.config.should.be.a('object');
                                                        getRes.body.pluginconf.plugin1.config.should.have.all.keys(
                                                                'setting1',
                                                                'setting2'
                                                        );
                                                        getRes.body.pluginconf.plugin1.config.setting1.should.eql(
                                                                capcode.pluginconf.plugin1.config.setting1
                                                        );
                                                        getRes.body.pluginconf.plugin1.config.setting2.should.eql(
                                                                capcode.pluginconf.plugin1.config.setting2
                                                        );
                                                        getRes.body.ignore.should.eql(capcode.ignore);
                                                        getRes.body.onlyShowLoggedIn.should.satisfy(
                                                                (val) => val == capcode.onlyShowLoggedIn
                                                        );
                                                        done();
                                                });
                                });
                });
        });
        describe('insuficient permissions', () => {
                it('should return a 403 when not admin', (done) => {
                        passportStub.login({
                                username: 'useractive',
                                password: 'changeme',
                                role: 'user',
                        });
                        const capcode = {
                                id: 1,
                                address: '12345672',
                                alias: 'Newly updated',
                                agency: 'UPDATED',
                                icon: 'updated',
                                color: 'updated',
                                pluginconf: {
                                        plugin1: {
                                                enabled: true,
                                                config: {
                                                        setting1: 'value1',
                                                        setting2: 'value2',
                                                },
                                        },
                                        plugin2: {},
                                },
                                ignore: 0,
                                onlyShowLoggedIn: false,
                        };
                        chai.request(server)
                                .post('/api/capcodes')
                                .send(capcode)
                                .end((postErr, postRes) => {
                                        postRes.status.should.eql(403);
                                        postRes.type.should.eql('application/json');
                                        passportStub.login({
                                                username: 'adminactive',
                                                password: 'changeme',
                                                role: 'admin',
                                        });

                                        chai.request(server)
                                                .get(`/api/capcodes/${capcode.id}`)
                                                .end((getErr, getRes) => {
                                                        getRes.status.should.eql(200);
                                                        getRes.type.should.eql('application/json');
                                                        getRes.body.should.be.a('object');
                                                        getRes.body.should.have.property('id');
                                                        getRes.body.id.should.eql(capcode.id);
                                                        getRes.body.should.not.satisfy((retCapcode) => {
                                                                delete capcode.pluginconf;
                                                                const comparator = _.pick(
                                                                        retCapcode,
                                                                        Object.keys(capcode)
                                                                );
                                                                return _.isEqual(comparator, capcode);
                                                        });
                                                        done();
                                                });
                                });
                });
                it('should not create a new capcode when logged in as user', (done) => {
                        passportStub.login({
                                username: 'useractive',
                                password: 'changeme',
                                role: 'user',
                        });
                        const capcode = {
                                address: '12345673',
                                alias: 'Newly created',
                                agency: 'CREATED',
                                icon: 'CREATED',
                                color: 'CREATED',
                                pluginconf: {
                                        plugin1: {
                                                enabled: true,
                                                config: {
                                                        setting1: 'value1',
                                                        setting2: 'value2',
                                                },
                                        },
                                        plugin2: {},
                                },
                                ignore: 0,
                                onlyShowLoggedIn: false,
                        };
                        chai.request(server)
                                .post('/api/capcodes')
                                .send(capcode)
                                .end((postErr, postRes) => {
                                        postRes.status.should.eql(403);
                                        postRes.type.should.eql('application/json');
                                        passportStub.login({
                                                username: 'adminactive',
                                                password: 'changeme',
                                                role: 'admin',
                                        });

                                        chai.request(server)
                                                .get(`/api/capcodes`)
                                                .end((getErr, getRes) => {
                                                        getRes.status.should.eql(200);
                                                        getRes.type.should.eql('application/json');
                                                        getRes.body.should.be.a('array');
                                                        // Prüfe, dass in dem Array kein Capcode enthalten ist, der eine Übereinstimmung mit dem gesendeten Capcode hat, die ID darf jedoch abweichen
                                                        getRes.body.should.not.satisfy((retCapcode) => {
                                                                delete capcode.pluginconf;
                                                                const comparator = _.pick(
                                                                        retCapcode,
                                                                        Object.keys(capcode)
                                                                );
                                                                return _.isEqual(comparator, capcode);
                                                        });

                                                        done();
                                                });
                                });
                });
        });
        describe('wrong credentials', () => {
                it('should not update a capcode with wrong api key', (done) => {
                        const capcode = {
                                id: 1,
                                address: '12345672',
                                alias: 'Newly updated',
                                agency: 'UPDATED',
                                icon: 'updated',
                                color: 'updated',
                                pluginconf: {
                                        plugin1: {
                                                enabled: true,
                                                config: {
                                                        setting1: 'value1',
                                                        setting2: 'value2',
                                                },
                                        },
                                        plugin2: {},
                                },
                                ignore: 0,
                                onlyShowLoggedIn: false,
                        };
                        chai.request(server)
                                .post('/api/capcodes')
                                .set('apikey', 'wrongkeythatdoesntexist')
                                .send(capcode)
                                .end((postErr, postRes) => {
                                        postRes.status.should.eql(401);
                                        postRes.type.should.eql('application/json');
                                        passportStub.login({
                                                username: 'adminactive',
                                                password: 'changeme',
                                                role: 'admin',
                                        });

                                        chai.request(server)
                                                .get(`/api/capcodes/${capcode.id}`)
                                                .end((getErr, getRes) => {
                                                        getRes.status.should.eql(200);
                                                        getRes.type.should.eql('application/json');
                                                        getRes.body.should.be.a('object');
                                                        getRes.body.should.have.property('id');
                                                        getRes.body.id.should.eql(capcode.id);
                                                        getRes.body.should.not.satisfy((retCapcode) => {
                                                                delete capcode.pluginconf;
                                                                const comparator = _.pick(
                                                                        retCapcode,
                                                                        Object.keys(capcode)
                                                                );
                                                                return _.isEqual(comparator, capcode);
                                                        });
                                                        done();
                                                });
                                });
                });
                it('should not update a capcode when not logged in', (done) => {
                        const capcode = {
                                id: 1,
                                address: '12345672',
                                alias: 'Newly updated',
                                agency: 'UPDATED',
                                icon: 'updated',
                                color: 'updated',
                                pluginconf: {
                                        plugin1: {
                                                enabled: true,
                                                config: {
                                                        setting1: 'value1',
                                                        setting2: 'value2',
                                                },
                                        },
                                        plugin2: {},
                                },
                                ignore: 0,
                                onlyShowLoggedIn: false,
                        };
                        chai.request(server)
                                .post('/api/capcodes')
                                .send(capcode)
                                .end((postErr, postRes) => {
                                        postRes.status.should.eql(401);
                                        postRes.type.should.eql('application/json');
                                        passportStub.login({
                                                username: 'adminactive',
                                                password: 'changeme',
                                                role: 'admin',
                                        });

                                        chai.request(server)
                                                .get(`/api/capcodes/${capcode.id}`)
                                                .end((getErr, getRes) => {
                                                        getRes.status.should.eql(200);
                                                        getRes.type.should.eql('application/json');
                                                        getRes.body.should.be.a('object');
                                                        getRes.body.should.have.property('id');
                                                        getRes.body.id.should.eql(capcode.id);
                                                        getRes.body.should.not.satisfy((retCapcode) => {
                                                                delete capcode.pluginconf;
                                                                const comparator = _.pick(
                                                                        retCapcode,
                                                                        Object.keys(capcode)
                                                                );
                                                                return _.isEqual(comparator, capcode);
                                                        });
                                                        done();
                                                });
                                });
                });
                it('should not create a new capcode with wrong api key', (done) => {
                        const capcode = {
                                address: '12345673',
                                alias: 'Newly created',
                                agency: 'CREATED',
                                icon: 'CREATED',
                                color: 'CREATED',
                                pluginconf: {
                                        plugin1: {
                                                enabled: true,
                                                config: {
                                                        setting1: 'value1',
                                                        setting2: 'value2',
                                                },
                                        },
                                        plugin2: {},
                                },
                                ignore: 0,
                                onlyShowLoggedIn: false,
                        };
                        chai.request(server)
                                .post('/api/capcodes')
                                .set('apikey', 'wrongkeythatdoesntexist')
                                .send(capcode)
                                .end((postErr, postRes) => {
                                        postRes.status.should.eql(401);
                                        postRes.type.should.eql('application/json');

                                        passportStub.login({
                                                username: 'adminactive',
                                                password: 'changeme',
                                                role: 'admin',
                                        });

                                        chai.request(server)
                                                .get(`/api/capcodes/`)
                                                .end((getErr, getRes) => {
                                                        getRes.status.should.eql(200);
                                                        getRes.type.should.eql('application/json');
                                                        getRes.body.should.be.a('array');
                                                        // Prüfe, dass in dem Array kein Capcode enthalten ist, der eine Übereinstimmung mit dem gesendeten Capcode hat, die ID darf jedoch abweichen
                                                        getRes.body.should.not.satisfy((retCapcode) => {
                                                                delete capcode.pluginconf;
                                                                const comparator = _.pick(
                                                                        retCapcode,
                                                                        Object.keys(capcode)
                                                                );
                                                                return _.isEqual(comparator, capcode);
                                                        });

                                                        done();
                                                });
                                });
                });
                it('should not create a new capcode when not logged in', (done) => {
                        const capcode = {
                                address: '12345673',
                                alias: 'Newly created',
                                agency: 'CREATED',
                                icon: 'CREATED',
                                color: 'CREATED',
                                pluginconf: {
                                        plugin1: {
                                                enabled: true,
                                                config: {
                                                        setting1: 'value1',
                                                        setting2: 'value2',
                                                },
                                        },
                                        plugin2: {},
                                },
                                ignore: 0,
                                onlyShowLoggedIn: false,
                        };
                        chai.request(server)
                                .post('/api/capcodes')
                                .send(capcode)
                                .end((postErr, postRes) => {
                                        postRes.status.should.eql(401);
                                        postRes.type.should.eql('application/json');

                                        passportStub.login({
                                                username: 'adminactive',
                                                password: 'changeme',
                                                role: 'admin',
                                        });

                                        chai.request(server)
                                                .get(`/api/capcodes/`)
                                                .end((getErr, getRes) => {
                                                        getRes.status.should.eql(200);
                                                        getRes.type.should.eql('application/json');
                                                        getRes.body.should.be.a('array');
                                                        // Prüfe, dass in dem Array kein Capcode enthalten ist, der eine Übereinstimmung mit dem gesendeten Capcode hat, die ID darf jedoch abweichen
                                                        getRes.body.should.not.satisfy((retCapcode) => {
                                                                delete capcode.pluginconf;
                                                                const comparator = _.pick(
                                                                        retCapcode,
                                                                        Object.keys(capcode)
                                                                );
                                                                return _.isEqual(comparator, capcode);
                                                        });

                                                        done();
                                                });
                                });
                });
        });
        describe('invalid request', () => {
                it('should not update a capcode without address', (done) => {
                        passportStub.login({
                                username: 'adminactive',
                                password: 'changeme',
                                role: 'admin',
                        });
                        const capcode = {
                                id: 1,
                                alias: 'Newly updated',
                                agency: 'UPDATED',
                                icon: 'updated',
                                color: 'updated',
                                pluginconf: {
                                        plugin1: {
                                                enabled: true,
                                                config: {
                                                        setting1: 'value1',
                                                        setting2: 'value2',
                                                },
                                        },
                                        plugin2: {},
                                },
                                ignore: 0,
                                onlyShowLoggedIn: false,
                        };
                        chai.request(server)
                                .post('/api/capcodes')
                                .send(capcode)
                                .end((postErr, postRes) => {
                                        postRes.status.should.eql(400);
                                        postRes.type.should.eql('application/json');

                                        chai.request(server)
                                                .get(`/api/capcodes/${capcode.id}`)
                                                .end((getErr, getRes) => {
                                                        getRes.status.should.eql(200);
                                                        getRes.type.should.eql('application/json');
                                                        getRes.body.should.be.a('object');
                                                        getRes.body.should.have.property('id');
                                                        getRes.body.id.should.eql(capcode.id);
                                                        getRes.body.should.not.satisfy((retCapcode) => {
                                                                delete capcode.pluginconf;
                                                                const comparator = _.pick(
                                                                        retCapcode,
                                                                        Object.keys(capcode)
                                                                );
                                                                return _.isEqual(comparator, capcode);
                                                        });
                                                        done();
                                                });
                                });
                });
                it('should not update a capcode without alias', (done) => {
                        passportStub.login({
                                username: 'adminactive',
                                password: 'changeme',
                                role: 'admin',
                        });
                        const capcode = {
                                id: 1,
                                address: '12345672',
                                agency: 'UPDATED',
                                icon: 'updated',
                                color: 'updated',
                                pluginconf: {
                                        plugin1: {
                                                enabled: true,
                                                config: {
                                                        setting1: 'value1',
                                                        setting2: 'value2',
                                                },
                                        },
                                        plugin2: {},
                                },
                                ignore: 0,
                                onlyShowLoggedIn: false,
                        };
                        chai.request(server)
                                .post('/api/capcodes')
                                .send(capcode)
                                .end((postErr, postRes) => {
                                        postRes.status.should.eql(400);
                                        postRes.type.should.eql('application/json');
                                        passportStub.login({
                                                username: 'adminactive',
                                                password: 'changeme',
                                                role: 'admin',
                                        });

                                        chai.request(server)
                                                .get(`/api/capcodes/${capcode.id}`)
                                                .end((getErr, getRes) => {
                                                        getRes.status.should.eql(200);
                                                        getRes.type.should.eql('application/json');
                                                        getRes.body.should.be.a('object');
                                                        getRes.body.should.have.property('id');
                                                        getRes.body.id.should.eql(capcode.id);
                                                        getRes.body.should.not.satisfy((retCapcode) => {
                                                                delete capcode.pluginconf;
                                                                const comparator = _.pick(
                                                                        retCapcode,
                                                                        Object.keys(capcode)
                                                                );
                                                                return _.isEqual(comparator, capcode);
                                                        });
                                                        done();
                                                });
                                });
                });
        });
});

describe('GET /api/capcodes/:id', () => {
        it('should return specific capcode when logged in as admin', (done) => {
                passportStub.login({
                        username: 'adminactive',
                        password: 'changeme',
                        role: 'admin',
                });
                chai.request(server)
                        .get('/api/capcodes/2')
                        .end((err, res) => {
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('object');
                                res.body.should.have.property('id');
                                res.body.id.should.eql(2);
                                res.body.should.have.property('address');
                                res.body.address.should.eql('1234568');
                                res.body.should.have.property('alias');
                                res.body.alias.should.eql('Ambulance 1');
                                res.body.should.have.property('agency');
                                res.body.agency.should.eql('AMBULANCE');
                                res.body.should.have.property('icon');
                                res.body.icon.should.eql('ambulance');
                                res.body.should.have.property('color');
                                res.body.color.should.eql('green');
                                res.body.should.have.property('pluginconf');
                                res.body.should.have.property('ignore');
                                res.body.ignore.should.eql(0);
                                done();
                        });
        });
        it('should return blank capcode when id is new when logged in as admin', (done) => {
                passportStub.login({
                        username: 'adminactive',
                        password: 'changeme',
                        role: 'admin',
                });
                chai.request(server)
                        .get('/api/capcodes/new')
                        .end((err, res) => {
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('object');
                                res.body.should.have.property('id');
                                res.body.id.should.eql('');
                                res.body.should.have.property('address');
                                res.body.address.should.eql('');
                                res.body.should.have.property('alias');
                                res.body.alias.should.eql('');
                                res.body.should.have.property('agency');
                                res.body.agency.should.eql('');
                                res.body.should.have.property('icon');
                                res.body.icon.should.eql('question');
                                res.body.should.have.property('color');
                                res.body.color.should.eql('black');
                                res.body.should.have.property('pluginconf');
                                res.body.should.have.property('ignore');
                                res.body.ignore.should.eql(0);
                                done();
                        });
        });
        it('should return specific capcode when api key provided', (done) => {
                chai.request(server)
                        .get('/api/capcodes/2')
                        .set('apikey', 'reallylongkeythatneedstobechanged')
                        .end((err, res) => {
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('object');
                                res.body.should.have.property('id');
                                res.body.id.should.eql(2);
                                res.body.should.have.property('address');
                                res.body.address.should.eql('1234568');
                                res.body.should.have.property('alias');
                                res.body.alias.should.eql('Ambulance 1');
                                res.body.should.have.property('agency');
                                res.body.agency.should.eql('AMBULANCE');
                                res.body.should.have.property('icon');
                                res.body.icon.should.eql('ambulance');
                                res.body.should.have.property('color');
                                res.body.color.should.eql('green');
                                res.body.should.have.property('pluginconf');
                                res.body.should.have.property('ignore');
                                res.body.ignore.should.eql(0);
                                done();
                        });
        });
        it('should return blank capcode when id is new when api key provided', (done) => {
                chai.request(server)
                        .get('/api/capcodes/new')
                        .set('apikey', 'reallylongkeythatneedstobechanged')
                        .end((err, res) => {
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('object');
                                res.body.should.have.property('id');
                                res.body.id.should.eql('');
                                res.body.should.have.property('address');
                                res.body.address.should.eql('');
                                res.body.should.have.property('alias');
                                res.body.alias.should.eql('');
                                res.body.should.have.property('agency');
                                res.body.agency.should.eql('');
                                res.body.should.have.property('icon');
                                res.body.icon.should.eql('question');
                                res.body.should.have.property('color');
                                res.body.color.should.eql('black');
                                res.body.should.have.property('pluginconf');
                                res.body.should.have.property('ignore');
                                res.body.ignore.should.eql(0);
                                done();
                        });
        });
        it('should return a 403 when not admin', (done) => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme',
                });
                chai.request(server)
                        .get('/api/capcodes/2')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(403);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
        it('should return a 401 when not logged in', (done) => {
                chai.request(server)
                        .get('/api/capcodes/2')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
        it('should return a 401 when incorrect api key provided', (done) => {
                chai.request(server)
                        .get('/api/capcodes/2')
                        .set('apikey', 'shortkeythatdoesntexist')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
});

describe('POST /api/capcodes/:id', () => {});

describe('DELETE /api/capcodes/:id', () => {
        it('should delete a capcode when logged in as admin', (done) => {
                passportStub.login({
                        username: 'adminactive',
                        password: 'changeme',
                        role: 'admin',
                });
                chai.request(server)
                        .delete('/api/capcodes/2')
                        .end((err, res) => {
                                res.status.should.eql(200);
                                res.body.status.should.eql('ok');
                                done();
                        });
        });
        it('should delete a capcode when api key is provided', (done) => {
                chai.request(server)
                        .delete('/api/capcodes/2')
                        .set('apikey', 'reallylongkeythatneedstobechanged')
                        .end((err, res) => {
                                res.status.should.eql(200);
                                res.body.status.should.eql('ok');
                                done();
                        });
        });
        it('should return a 403 when not admin', (done) => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme',
                        role: 'user',
                });
                chai.request(server)
                        .delete('/api/capcodes/2')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(403);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
        it('should return a 401 when not logged in', (done) => {
                chai.request(server)
                        .delete('/api/capcodes/2')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
        it('should return a 401 when incorrect api key provided', (done) => {
                chai.request(server)
                        .delete('/api/capcodes/2')
                        .set('apikey', 'shortkeythatdoesntexist')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
});

describe('GET /api/capcodes/agency', () => {
        it('should return all agencies when logged in as admin', (done) => {
                passportStub.login({
                        username: 'adminactive',
                        password: 'changeme',
                        role: 'admin',
                });
                chai.request(server)
                        .get('/api/capcodes/agency')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('array');
                                res.body[0].should.have.property('agency');
                                res.body.length.should.eql(6);
                                done();
                        });
        });
        it('should return all capcodes when api key provided', (done) => {
                chai.request(server)
                        .get('/api/capcodes/agency')
                        .set('apikey', 'reallylongkeythatneedstobechanged')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('array');
                                res.body[0].should.have.property('agency');
                                res.body.length.should.eql(6);
                                done();
                        });
        });
        it('should return a 403 when not admin', (done) => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme',
                        role: 'user',
                });
                chai.request(server)
                        .get('/api/capcodes/agency')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(403);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
        it('should return a 401 when not logged in', (done) => {
                chai.request(server)
                        .get('/api/capcodes/agency')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
        it('should return a 401 when incorrect api key provided', (done) => {
                chai.request(server)
                        .get('/api/capcodes/agency')
                        .set('apikey', 'shortkeythatdoesntexist')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
});

describe('GET /api/capcodes/agency/:id', () => {
        it('should return all capcodes with specific agency when logged in as admin', (done) => {
                passportStub.login({
                        username: 'adminactive',
                        password: 'changeme',
                        role: 'admin',
                });
                chai.request(server)
                        .get('/api/capcodes/agency/FIRE')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('array');
                                res.body[0].should.have.property('id');
                                res.body[0].id.should.eql(1);
                                res.body[0].should.have.property('address');
                                res.body[0].address.should.eql('1234567');
                                res.body[0].should.have.property('alias');
                                res.body[0].alias.should.eql('Fire Brigade');
                                res.body[0].should.have.property('agency');
                                res.body[0].agency.should.eql('FIRE');
                                res.body[0].should.have.property('icon');
                                res.body[0].icon.should.eql('fire');
                                res.body[0].should.have.property('color');
                                res.body[0].color.should.eql('red');
                                res.body[0].should.have.property('pluginconf');
                                res.body[0].should.have.property('ignore');
                                res.body[0].ignore.should.eql(0);
                                res.body.length.should.eql(1);
                                done();
                        });
        });
        it('should return all capcodes with specific agency when api key provided', (done) => {
                chai.request(server)
                        .get('/api/capcodes/agency/FIRE')
                        .set('apikey', 'reallylongkeythatneedstobechanged')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('array');
                                res.body[0].should.have.property('id');
                                res.body[0].id.should.eql(1);
                                res.body[0].should.have.property('address');
                                res.body[0].address.should.eql('1234567');
                                res.body[0].should.have.property('alias');
                                res.body[0].alias.should.eql('Fire Brigade');
                                res.body[0].should.have.property('agency');
                                res.body[0].agency.should.eql('FIRE');
                                res.body[0].should.have.property('icon');
                                res.body[0].icon.should.eql('fire');
                                res.body[0].should.have.property('color');
                                res.body[0].color.should.eql('red');
                                res.body[0].should.have.property('pluginconf');
                                res.body[0].should.have.property('ignore');
                                res.body[0].ignore.should.eql(0);
                                res.body.length.should.eql(1);
                                done();
                        });
        });
        it('should return a 403 when not admin', (done) => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme',
                        role: 'user',
                });
                chai.request(server)
                        .get('/api/capcodes/agency/FIRE')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(403);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
        it('should return a 401 when not logged in', (done) => {
                chai.request(server)
                        .get('/api/capcodes/agency/FIRE')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
        it('should return a 401 when incorrect api key provided', (done) => {
                chai.request(server)
                        .get('/api/capcodes/agency/FIRE')
                        .set('apikey', 'shortkeythatdoesntexist')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
});

describe('GET /api/capcodeCheck/:id', () => {
        it('should return a capcode when address exists and logged in as admin', (done) => {
                passportStub.login({
                        username: 'adminactive',
                        password: 'changeme',
                        role: 'admin',
                });
                chai.request(server)
                        .get('/api/capcodeCheck/1234568')
                        .end((err, res) => {
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('object');
                                res.body.should.have.property('id');
                                res.body.id.should.eql(2);
                                res.body.should.have.property('address');
                                res.body.address.should.eql('1234568');
                                res.body.should.have.property('alias');
                                res.body.alias.should.eql('Ambulance 1');
                                res.body.should.have.property('agency');
                                res.body.agency.should.eql('AMBULANCE');
                                res.body.should.have.property('icon');
                                res.body.icon.should.eql('ambulance');
                                res.body.should.have.property('color');
                                res.body.color.should.eql('green');
                                res.body.should.have.property('pluginconf');
                                res.body.should.have.property('ignore');
                                res.body.ignore.should.eql(0);
                                done();
                        });
        });
        it('should return blank capcode when address doesnt exist and logged in as admin', (done) => {
                passportStub.login({
                        username: 'adminactive',
                        password: 'changeme',
                        role: 'admin',
                });
                chai.request(server)
                        .get('/api/capcodeCheck/7654321')
                        .end((err, res) => {
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('object');
                                res.body.should.have.property('id');
                                res.body.id.should.eql('');
                                res.body.should.have.property('address');
                                res.body.address.should.eql('');
                                res.body.should.have.property('alias');
                                res.body.alias.should.eql('');
                                res.body.should.have.property('agency');
                                res.body.agency.should.eql('');
                                res.body.should.have.property('icon');
                                res.body.icon.should.eql('question');
                                res.body.should.have.property('color');
                                res.body.color.should.eql('black');
                                res.body.should.have.property('pluginconf');
                                res.body.should.have.property('ignore');
                                res.body.ignore.should.eql(0);
                                done();
                        });
        });
        it('should return a capcode when address exists and apikey provided', (done) => {
                chai.request(server)
                        .get('/api/capcodeCheck/1234568')
                        .set('apikey', 'reallylongkeythatneedstobechanged')
                        .end((err, res) => {
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('object');
                                res.body.should.have.property('id');
                                res.body.id.should.eql(2);
                                res.body.should.have.property('address');
                                res.body.address.should.eql('1234568');
                                res.body.should.have.property('alias');
                                res.body.alias.should.eql('Ambulance 1');
                                res.body.should.have.property('agency');
                                res.body.agency.should.eql('AMBULANCE');
                                res.body.should.have.property('icon');
                                res.body.icon.should.eql('ambulance');
                                res.body.should.have.property('color');
                                res.body.color.should.eql('green');
                                res.body.should.have.property('pluginconf');
                                res.body.should.have.property('ignore');
                                res.body.ignore.should.eql(0);
                                done();
                        });
        });
        it('should return blank capcode when address doesnt exist and apikey provided', (done) => {
                chai.request(server)
                        .get('/api/capcodeCheck/7654321')
                        .set('apikey', 'reallylongkeythatneedstobechanged')
                        .end((err, res) => {
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('object');
                                res.body.should.have.property('id');
                                res.body.id.should.eql('');
                                res.body.should.have.property('address');
                                res.body.address.should.eql('');
                                res.body.should.have.property('alias');
                                res.body.alias.should.eql('');
                                res.body.should.have.property('agency');
                                res.body.agency.should.eql('');
                                res.body.should.have.property('icon');
                                res.body.icon.should.eql('question');
                                res.body.should.have.property('color');
                                res.body.color.should.eql('black');
                                res.body.should.have.property('pluginconf');
                                res.body.should.have.property('ignore');
                                res.body.ignore.should.eql(0);
                                done();
                        });
        });
        it('should return a 403 when not admin', (done) => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme',
                        role: 'user',
                });
                chai.request(server)
                        .get('/api/capcodeCheck/1234567')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(403);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
        it('should return a 401 when not logged in', (done) => {
                chai.request(server)
                        .get('/api/capcodeCheck/1234567')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
        it('should return a 401 when incorrect api key provided', (done) => {
                chai.request(server)
                        .get('/api/capcodeCheck/1234567')
                        .set('apikey', 'shortkeythatdoesntexist')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
});

describe('POST /api/capcodeRefresh', () => {
        it('should perform a capcode refresh when admin', (done) => {
                passportStub.login({
                        username: 'adminactive',
                        password: 'changeme',
                        role: 'admin',
                });
                chai.request(server)
                        .post('/api/capcodeRefresh')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.body.should.have.property('status').eql('ok');
                                res.type.should.eql('application/json');
                                done();
                        });
        });
        it('should perform a capcode refresh when apikey provided', (done) => {
                chai.request(server)
                        .post('/api/capcodeRefresh')
                        .set('apikey', 'reallylongkeythatneedstobechanged')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.body.should.have.property('status').eql('ok');
                                res.type.should.eql('application/json');
                                done();
                        });
        });
        it('should return a 403 when not admin', (done) => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme',
                        role: 'user',
                });
                chai.request(server)
                        .post('/api/capcodeRefresh')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(403);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
        it('should return a 401 when not logged in', (done) => {
                chai.request(server)
                        .post('/api/capcodeRefresh')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
        it('should return a 401 when incorrect api key provided', (done) => {
                chai.request(server)
                        .post('/api/capcodeRefresh')
                        .set('apikey', 'shortkeythatdoesntexist')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
});

describe('POST /api/capcodeExport', () => {
        it('should perform a capcode export when admin', (done) => {
                passportStub.login({
                        username: 'adminactive',
                        password: 'changeme',
                        role: 'admin',
                });
                chai.request(server)
                        .post('/api/capcodeExport')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.body.should.have.property('status').eql('ok');
                                res.body.should.have.property('data');
                                res.type.should.eql('application/json');
                                done();
                        });
        });
        it('should return a 403 when not admin', (done) => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme',
                        role: 'user',
                });
                chai.request(server)
                        .post('/api/capcodeExport')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(403);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
        it('should return a 401 when not logged in', (done) => {
                chai.request(server)
                        .post('/api/capcodeExport')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
        it('should return a 401 when incorrect api key provided', (done) => {
                chai.request(server)
                        .post('/api/capcodeExport')
                        .set('apikey', 'shortkeythatdoesntexist')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.type.should.eql('application/json');
                                done();
                        });
        });
});

describe('POST /api/capcodeImport', () => {});
