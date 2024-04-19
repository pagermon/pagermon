process.env.NODE_ENV = 'test';

const chai = require('chai');
const moment = require('moment');

const should = chai.should();
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

const confFile = './config/config.json';
// load the config file
const nconf = require('nconf');

nconf.file({ file: confFile });
nconf.load();

const passportStub = require('passport-stub');
// eslint-disable-next-line vars-on-top
var server = require('../app');
const db = require('../knex/knex.js');
// This needs to be sorted out, use a different config file when testing?

passportStub.install(server);
// set required settings in config file

beforeEach(() => db.migrate.rollback().then(() => db.migrate.latest().then(() => db.seed.run())));
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
                                res.body.length.should.eql(5);
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
                                res.body.length.should.eql(5);
                                done();
                        });
        });
        it('should return a 401 when not admin', (done) => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme',
                        role: 'user',
                });
                chai.request(server)
                        .get('/api/capcodes')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
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

describe('POST /api/capcodes', () => {});

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
        it('should return a 401 when not admin', (done) => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme',
                        role: 'user',
                });
                chai.request(server)
                        .get('/api/capcodes/2')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
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
        it('should return a 401 when not admin', (done) => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme',
                        role: 'user',
                });
                chai.request(server)
                        .delete('/api/capcodes/2')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
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
                                res.body.length.should.eql(5);
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
                                res.body.length.should.eql(5);
                                done();
                        });
        });
        it('should return a 401 when not admin', (done) => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme',
                        role: 'user',
                });
                chai.request(server)
                        .get('/api/capcodes/agency')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
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
        it('should return a 401 when not admin', (done) => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme',
                        role: 'user',
                });
                chai.request(server)
                        .get('/api/capcodes/agency/FIRE')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
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
        it('should return a 401 when not admin', (done) => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme',
                        role: 'user',
                });
                chai.request(server)
                        .get('/api/capcodeCheck/1234567')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
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
        it('should return a 401 when not admin', (done) => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme',
                        role: 'user',
                });
                chai.request(server)
                        .post('/api/capcodeRefresh')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
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
        it('should return a 401 when not admin', (done) => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme',
                        role: 'user',
                });
                chai.request(server)
                        .post('/api/capcodeExport')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
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
