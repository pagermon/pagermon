process.env.NODE_ENV = 'test';

const chai = require('chai');

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

passportStub.install(server);
// set required settings in config file

// Force someconfigs back to default
nconf.set('messages:HideCapcode', false);
nconf.set('messages:HideSource', false);
nconf.set('messages:apiSecurity', false);
nconf.save();

beforeEach(() => db.migrate.rollback().then(() => db.migrate.latest().then(() => db.seed.run())));
afterEach(() => db.migrate.rollback().then(() => passportStub.logout()));

describe('GET /api/messageSearch', () => {
        it('should return result for existing term', (done) => {
                chai.request(server)
                        .get('/api/messageSearch?q=test')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('object');
                                res.body.messages[0].should.have.property('id').eql(4);
                                res.body.messages[0].should.have.property('address').eql('1234569');
                                res.body.messages[0].should.have
                                        .property('message')
                                        .eql('This is a Test Message to Address 1234569');
                                res.body.messages[0].should.have.property('source').eql('Client 3');
                                done();
                        });
        });
        it('should not return result for non-existing term', (done) => {
                chai.request(server)
                        .get('/api/messageSearch?q=thisisnotmessage')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('object');
                                should.not.exist(res.body.messages[0]);
                                done();
                        });
        });
        it('should return result for existing alias', (done) => {
                chai.request(server)
                        .get('/api/messageSearch?alias=2')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('object');
                                res.body.messages[0].should.have.property('id').eql(3);
                                res.body.messages[0].should.have.property('address').eql('1234569');
                                res.body.messages[0].should.have
                                        .property('message')
                                        .eql('This is a Test Message to Address 1234569');
                                res.body.messages[0].should.have.property('source').eql('Client 1');
                                done();
                        });
        });
        it('should return result for message missing alias', (done) => {
                chai.request(server)
                        .get('/api/messageSearch?alias=-1')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('object');
                                res.body.messages[0].should.have.property('id').eql(6);
                                res.body.messages[0].should.have.property('address').eql('1234572');
                                res.body.messages[0].should.have
                                        .property('message')
                                        .eql('This is a Test Message to non-stored Address 1234572');
                                res.body.messages[0].should.have.property('source').eql('Client 4');
                                done();
                        });
        });
        it('should not return result for alias with no messages', (done) => {
                chai.request(server)
                        .get('/api/messageSearch?alias=4')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('object');
                                should.not.exist(res.body.messages[0]);
                                done();
                        });
        });
        it('should not return result for non-existing alias', (done) => {
                chai.request(server)
                        .get('/api/messageSearch?alias=18')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('object');
                                should.not.exist(res.body.messages[0]);
                                done();
                        });
        });
        it('should return result for existing address', (done) => {
                chai.request(server)
                        .get('/api/messageSearch?address=1234569')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('object');
                                res.body.messages[0].should.have.property('id').eql(4);
                                res.body.messages[0].should.have.property('address').eql('1234569');
                                res.body.messages[0].should.have
                                        .property('message')
                                        .eql('This is a Test Message to Address 1234569');
                                res.body.messages[0].should.have.property('source').eql('Client 3');
                                done();
                        });
        });
        it('should not return result for non-existing address', (done) => {
                chai.request(server)
                        .get('/api/messageSearch?address=1234585')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('object');
                                should.not.exist(res.body.messages[0]);
                                done();
                        });
        });
});
