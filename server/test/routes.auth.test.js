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
const passportStub = require('passport-stub');

passportStub.install(server);

nconf.file({ file: confFile });
nconf.load();
// set required settings in config file

beforeEach(() => db.migrate.rollback().then(() => db.migrate.latest().then(() => db.seed.run())));

afterEach(() => db.migrate.rollback().then(() => passportStub.logout()));

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
        it('should return the index if a user is logged in', done => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme'
                      });
                chai.request(server)
                        .get('/auth/login')
                        .redirects(0)
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(302);
                                res.should.redirectTo('/');
                                done();
                        });
        });
});

describe('POST /auth/login', () => {
        it('should log the user in if correct credentials are provided', done => {
                chai.request(server)
                        .post('/auth/login')
                        .send({
                                username:'useractive',
                                password: 'changeme'
                        })
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.body.status.should.eql('ok')
                                res.body.redirect.should.eql('/');
                                done();
                        });
        });
        it('should log the admin in if correct credentials are provided', done => {
                chai.request(server)
                        .post('/auth/login')
                        .send({
                                username:'adminactive',
                                password: 'changeme'
                        })
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.body.status.should.eql('ok')
                                res.body.redirect.should.eql('/admin');
                                done();
                        });
        });
        it('should not login on invalid username', done => {
                chai.request(server)
                        .post('/auth/login')
                        .send({
                                username:'notarealuser',
                                password: 'changeme'
                        })
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.body.status.should.eql('failed')
                                res.body.error.should.eql('Check Details and try again')
                                done();
                        });
        });
        it('should not login on invalid password', done => {
                chai.request(server)
                        .post('/auth/login')
                        .send({
                                username:'useractive',
                                password: 'changeme2'
                        })
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.body.status.should.eql('failed')
                                res.body.error.should.eql('Check Details and try again')
                                done();
                        });
        });
        it('should not login when user is disabled', done => {
                chai.request(server)
                        .post('/auth/login')
                        .send({
                                username:'admindisabled',
                                password: 'changeme'
                        })
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                res.body.status.should.eql('failed')
                                res.body.error.should.eql('User Disabled')
                                done();
                        });
        });
});

describe('GET /auth/logout', () => {
        it('should log the user out', done => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme'
                      });
                chai.request(server)
                        .get('/auth/logout')
                        .redirects(0)
                        .end((err, res) => {
                                should.not.exist(err);
                                res.should.redirectTo('/')
                                done();
                        });
        });
});

describe('GET /auth/profile', () => {
        it('should return the profile page if user is logged in', done => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme'
                      });
                chai.request(server)
                        .get('/auth/profile')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('text/html');
                                done();
                        });
        });
        it('should return an error if not logged in ', done => {
                chai.request(server)
                        .get('/auth/profile')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                done();
                        });
        });
});

describe('GET /auth/profile/:id', () => {
        it('should return the information of the logged in user', done => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme'
                      });
                chai.request(server)
                        .get('/auth/profile/1')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.should.be.json;
                                res.body.should.be.a('object');
                                res.body.should.have.property('id');
                                res.body.id.should.equal(2);
                                res.body.should.have.property('givenname');
                                res.body.givenname.should.equal('Active');
                                res.body.should.have.property('surname');
                                res.body.surname.should.equal('User');
                                res.body.should.have.property('username');
                                res.body.username.should.equal('useractive');
                                res.body.should.have.property('email');
                                res.body.email.should.equal('none1@none.com');
                                done();
                        });
        });
        it('should not return the information of other users', done => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme'
                      });
                chai.request(server)
                        .get('/auth/profile/2')
                        .send({'user.username': 'adminactive'})
                        .end((err, res) => {
                                should.not.exist(err);
                                res.should.be.json;
                                res.body.should.be.a('object');
                                res.body.should.have.property('id');
                                res.body.id.should.equal(2);
                                res.body.should.have.property('givenname');
                                res.body.givenname.should.equal('Active');
                                res.body.should.have.property('surname');
                                res.body.surname.should.equal('User');
                                res.body.should.have.property('username');
                                res.body.username.should.equal('useractive');
                                res.body.should.have.property('email');
                                res.body.email.should.equal('none1@none.com');
                                done();
                        });
        });
        it('should not return anything if no user is logged in', done => {
                chai.request(server)
                        .get('/auth/profile/2')
                        .send({'user.username': 'adminactive'})
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(401);
                                done();
                        });
        });
});

describe('GET /auth/register', () => {
        nconf.set('auth:registration', true);
        nconf.save();           
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
        
        it('should return the index if disabled', done => {
                nconf.set('auth:registration', false);
                nconf.save();
                chai.request(server)
                        .get('/auth/register')
                        .redirects(0)
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(302);
                                res.should.redirectTo('/');
                                done();
                        });
        });
});

describe('POST /auth/register', () => {   
        it('should register a new user', done => {
                nconf.set('auth:registration', true);
                nconf.save();
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
                                username: 'adminactive',
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

describe('GET /auth/reset', () => {
        it('should return the reset page if user is logged in', done => {
                passportStub.login({
                        username: 'useractive',
                        password: 'changeme'
                      });
                chai.request(server)
                        .get('/auth/reset')
                        .end((err, res) => {
                                should.not.exist(err);
                                res.status.should.eql(200);
                                res.type.should.eql('text/html');
                                done();
                        });
        });
        it('should redirect to login page if no user logged in', done => {
                chai.request(server)
                        .get('/auth/reset')
                        .redirects(0)
                        .end((err, res) => {
                                should.not.exist(err);
                                res.should.redirectTo('/auth/login')
                                done();
                        });
        });
});
