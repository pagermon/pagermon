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
        it('should return resut for existing term', done => {
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
        it('should not return resut for non-existing term', done => {
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
});
