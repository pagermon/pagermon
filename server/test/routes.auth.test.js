process.env.NODE_ENV = 'test';

const chai = require('chai');

const should = chai.should();
const chaiHttp = require('chai-http');

chai.use(chaiHttp);

const confFile = './config/config.json';
// load the config file
const nconf = require('nconf');

const server = require('../app');
const db = require('../knex/knex.js');
// This needs to be sorted out, use a different config file when testing?

nconf.file({ file: confFile });
nconf.load();
// set required settings in config file
nconf.set('auth:registration', true);
nconf.save();

describe('GET /auth/login', () => {
        it('should return the login page', done => {
                chai.request(server)
                        .get('/auth/login')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('text/html');
                                done();
                        });
        });
});

describe('GET /auth/profile', () => {
        it('should return the profile page if the user is logged in', done => {});
        it('should return an error if user is not logged in', done => {});
});

describe('POST /auth/profile', () => {
        it('should return the profile page if the user is logged in', done => {});
});

describe('GET /auth/register', () => {
        it('should return the registration page if enabled', done => {
                chai.request(server)
                        .get('/auth/register')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('text/html');
                                done();
                        });
        });
});

describe('POST /auth/register', () => {
        beforeEach(() => db.migrate.rollback().then(() => db.migrate.latest()));

        afterEach(() => db.migrate.rollback());
        it('should register a new user', done => {
                chai.request(server)
                        .post('/auth/register')
                        .send({
                                username: 'test',
                                password: '$2a$08$De/aXnQkZIEbQ9p8J22tHuzLltqIbsAxE2CGgRMPLaaIwwHmVrpsu',
                                givenname: 'Test',
                                surname: 'User',
                                email: 'Test@test.com',
                        })
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('application/json');
                                res.body.status.should.eql('ok');
                                done();
                        });
        });
        it('should not register a duplicate user', done => {
                chai.request(server)
                        .post('/auth/register')
                        .send({
                                username: 'admin',
                                password: '$2a$08$De/aXnQkZIEbQ9p8J22tHuzLltqIbsAxE2CGgRMPLaaIwwHmVrpsu',
                                givenname: 'Admin',
                                surname: 'User',
                                email: 'Test@test.com',
                        })
                        .end((err, res) => {
                                res.status.should.eql(401);
                                res.type.should.eql('application/json');
                                res.body.error.should.eql('access denied');
                                done();
                        });
        });
        it('should not allow registration when registration is disabled in config', done => {
                nconf.set('auth:registration', false);
                nconf.save();
                chai.request(server)
                        .post('/auth/register')
                        .send({
                                username: 'test',
                                password: '$2a$08$De/aXnQkZIEbQ9p8J22tHuzLltqIbsAxE2CGgRMPLaaIwwHmVrpsu',
                                givenname: 'Admin',
                                surname: 'User',
                                email: 'Test@test.com',
                        })
                        .end((err, res) => {
                                res.status.should.eql(400);
                                res.type.should.eql('application/json');
                                res.body.error.should.eql('registration disabled');
                                done();
                        });
        });
});
