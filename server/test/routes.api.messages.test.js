process.env.NODE_ENV = 'test';

const chai = require('chai');
const moment = require('moment');

const should = chai.should();
const chaiHttp = require('chai-http');

const datetime = moment().unix();

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

// Force someconfigs back to default
nconf.set('messages:HideCapcode', false);
nconf.set('messages:HideSource', false);
nconf.set('messages:apiSecurity', false);
nconf.save();

passportStub.install(server);
// set required settings in config file

beforeEach(() => db.migrate.rollback().then(() => db.migrate.latest().then(() => db.seed.run())));
afterEach(() => db.migrate.rollback().then(() => passportStub.logout()));

describe('POST /api/messages', () => {
        it('should POST new message', done => {
                chai.request(server)
                        .post('/api/messages')
                        .set({
                                'X-Requested-With': 'XMLHttpRequest',
                                'User-Agent': 'CI-Test',
                                apikey: 'reallylongkeythatneedstobechanged',
                        })
                        .send({
                                address: '000000',
                                message: '!@#$%^& (This is a test message. 1a2b3c4d5e6e7f) !@#$%^&',
                                datetime,
                                source: 'CI-Test',
                        })
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('text/html');
                                res.text.should.be.eql('6');
                                done();
                        });
        });
});

describe('GET /api/messages', () => {
        it('should return message id 5', done => {
                nconf.set('messages:HideCapcode', false);
                nconf.set('messages:HideSource', false);
                nconf.set('messages:apiSecurity', false);
                nconf.save();
                chai.request(server)
                        .get('/api/messages/5')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('array');
                                res.body[0].should.have.property('id').eql(5);
                                res.body[0].should.have.property('address').eql('1234570');
                                res.body[0].should.have
                                        .property('message')
                                        .eql('This is a Test Message to Address 1234570');
                                res.body[0].should.have.property('source').eql('Client 4');
                                done();
                        });
        });
        it('should show capcode in hidecapcode mode if logged in ', done => {
                nconf.set('messages:HideCapcode', true);
                nconf.save();
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme',
                });
                chai.request(server)
                        .get('/api/messages')
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
                                nconf.set('messages:HideCapcode', false);
                                done();
                        });
        });
        it('should not show capcode in hidecapcode mode if not logged in ', done => {
                nconf.set('messages:HideCapcode', true);
                nconf.save();
                chai.request(server)
                        .get('/api/messages')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.should.be.a('object');
                                res.body.messages[0].should.have.property('id').eql(4);
                                res.body.messages[0].should.not.have.property('address').eql('1234569');
                                res.body.messages[0].should.have
                                        .property('message')
                                        .eql('This is a Test Message to Address 1234569');
                                res.body.messages[0].should.have.property('source').eql('Client 3');
                                nconf.set('messages:HideCapcode', false);
                                done();
                        });
        });
        it('should 401 if securemode is enabled and not logged in ', done => {
                nconf.set('messages:apiSecurity', true);
                nconf.save();
                chai.request(server)
                        .get('/api/messages')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.type.should.eql('application/json');
                                nconf.set('messages:apiSecurity', false);
                                done();
                        });
        });
        it('should 200 if securemode is enabled and logged in ', done => {
                nconf.set('messages:apiSecurity', true);
                nconf.save();
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme',
                });
                chai.request(server)
                        .get('/api/messages')
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
                                nconf.set('messages:apiSecurity', false);
                                done();
                        });
        });
});
