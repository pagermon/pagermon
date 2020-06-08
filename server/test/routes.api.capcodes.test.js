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

describe('GET /api/capcodes', () => {
    it('should return all capcodes when logged in as admin', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
          });
        chai.request(server)
                    .get('/api/capcodes')
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(200);
                            res.type.should.eql('application/json');
                            res.body.should.be.a('array');
                            res.body[0].should.have.property('id')
                            res.body[0].should.have.property('address')
                            res.body[0].should.have.property('alias')
                            res.body[0].should.have.property('agency')
                            res.body[0].should.have.property('icon')
                            res.body[0].should.have.property('color')
                            res.body[0].should.have.property('pluginconf')
                            res.body[0].should.have.property('ignore')
                            res.body.length.should.eql(4)
                            done();
                    });
    });
    it('should return all capcodes when api key used', done => {
        chai.request(server)
                    .get('/api/capcodes')
                    .set('apikey', 'reallylongkeythatneedstobechanged')
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(200);
                            res.type.should.eql('application/json');
                            res.body.should.be.a('array');
                            res.body[0].should.have.property('id')
                            res.body[0].should.have.property('address')
                            res.body[0].should.have.property('alias')
                            res.body[0].should.have.property('agency')
                            res.body[0].should.have.property('icon')
                            res.body[0].should.have.property('color')
                            res.body[0].should.have.property('pluginconf')
                            res.body[0].should.have.property('ignore')
                            res.body.length.should.eql(4)
                            done();
                    });
    });
    it('should return a 401 when not admin', done => {
        passportStub.login({
            username: 'useractive',
            password: 'changeme',
            role: 'user'
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
    it('should return a 401 when not logged in', done => {
        chai.request(server)
                    .get('/api/capcodes')
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(401);
                            res.type.should.eql('application/json');
                            done();
                    });
    });
    it('should return a 401 when incorrect api key provided', done => {
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