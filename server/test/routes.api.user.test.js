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

beforeEach(() => db.migrate.rollback().then(() => db.migrate.latest().then(() => db.seed.run())));

afterEach(() => db.migrate.rollback().then(() => passportStub.logout()));

describe('GET /api/user', () => {
    it('should return all users if logged in as admin', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
        });
        chai.request(server)
            .get('/api/user')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(200);
                res.body.should.be.a('array');
                res.body[0].should.have.property('id')
                res.body[0].should.have.property('givenname')
                res.body[0].should.have.property('surname')
                res.body[0].should.have.property('username')
                res.body[0].should.have.property('email')
                res.body[0].should.have.property('role')
                res.body[0].should.have.property('status')
                res.body[0].should.have.property('lastlogondate')
                res.body.length.should.eql(3)
                res.type.should.eql('application/json');
                done();
            });
    });
    it('should return all users if an api key is provided', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
        });
        chai.request(server)
            .get('/api/user')
            .set('apikey', 'reallylongkeythatneedstobechanged')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(200);
                res.body.should.be.a('array');
                res.body[0].should.have.property('id')
                res.body[0].should.have.property('givenname')
                res.body[0].should.have.property('surname')
                res.body[0].should.have.property('username')
                res.body[0].should.have.property('email')
                res.body[0].should.have.property('role')
                res.body[0].should.have.property('status')
                res.body[0].should.have.property('lastlogondate')
                res.body.length.should.eql(3)
                res.type.should.eql('application/json');
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
            .get('/api/user')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                done();
            });
    });
    it('should return a 401 when not logged in', done => {
        chai.request(server)
            .get('/api/user')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                done();
            });
    });
    it('should return a 401 when incorrect api key provided', done => {
        chai.request(server)
            .get('/api/user')
            .set('apikey', 'shortkeythatdoesntexist')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                done();
            });
    });
});

describe('GET /api/user/:id', () => {
    it('should return specific user when logged in as admin', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
        });
        chai.request(server)
            .get('/api/user/2')
            .end((err, res) => {
                res.status.should.eql(200);
                res.type.should.eql('application/json');
                res.body.should.be.a('object');
                res.body.should.have.property('id')
                res.body.should.have.property('givenname')
                res.body.should.have.property('surname')
                res.body.should.have.property('username')
                res.body.should.have.property('email')
                res.body.should.have.property('role')
                res.body.should.have.property('status')
                done();
            });
    });
    it('should return blank user when id is new when logged in as admin', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
        });
        chai.request(server)
            .get('/api/user/new')
            .end((err, res) => {
                res.status.should.eql(200);
                res.type.should.eql('application/json');
                res.body.should.be.a('object');
                res.body.should.have.property('givenname')
                res.body.should.have.property('surname')
                res.body.should.have.property('username')
                res.body.should.have.property('email')
                res.body.should.have.property('role')
                res.body.should.have.property('status')
                done();
            });
    });
    it('should return specific user when api key provided', done => {
        chai.request(server)
            .get('/api/user/2')
            .set('apikey', 'reallylongkeythatneedstobechanged')
            .end((err, res) => {
                res.status.should.eql(200);
                res.type.should.eql('application/json');
                res.body.should.be.a('object');
                res.body.should.have.property('id')
                res.body.should.have.property('givenname')
                res.body.should.have.property('surname')
                res.body.should.have.property('username')
                res.body.should.have.property('email')
                res.body.should.have.property('role')
                res.body.should.have.property('status')
                done();
            });
    });
    it('should return blank user when id is new when api key provided', done => {
        chai.request(server)
            .get('/api/user/new')
            .set('apikey', 'reallylongkeythatneedstobechanged')
            .end((err, res) => {
                res.status.should.eql(200);
                res.type.should.eql('application/json');
                res.body.should.be.a('object');
                res.body.should.have.property('givenname')
                res.body.should.have.property('surname')
                res.body.should.have.property('username')
                res.body.should.have.property('email')
                res.body.should.have.property('role')
                res.body.should.have.property('status')
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
            .get('/api/user/2')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                done();
            });
    });
    it('should return a 401 when not logged in', done => {
        chai.request(server)
            .get('/api/user/2')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                done();
            });
    });
    it('should return a 401 when incorrect api key provided', done => {
        chai.request(server)
            .get('/api/user/2')
            .set('apikey', 'shortkeythatdoesntexist')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                done();
            });
    });
});

describe('GET /api/userCheck/username/:id', () => {
    it('should return an username if the submitted username exists', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
        });
        chai.request(server)
            .get('/api/userCheck/username/useractive')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(200);
                res.type.should.eql('application/json');
                res.body.username.should.eql('useractive')
                done();
            });
    });
    it('should return an empty username if the submitted username does not exist', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
        });
        chai.request(server)
            .get('/api/userCheck/username/idontexist')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(200);
                res.type.should.eql('application/json');
                res.body.username.should.eql('');
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
            .get('/api/userCheck/username/idontexist')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                done();
            });
    });
    it('should return a 401 when not logged in', done => {
        chai.request(server)
            .get('/api/userCheck/username/idontexist')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                done();
            });
    });
    it('should return a 401 when incorrect api key provided', done => {
        chai.request(server)
            .get('/api/userCheck/username/idontexist')
            .set('apikey', 'shortkeythatdoesntexist')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                done();
            });
    });
});

describe('GET /api/userCheck/email/:id', () => {
    it('should return an email if the submitted email exists', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
        });
        chai.request(server)
            .get('/api/userCheck/email/none1@none.com')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(200);
                res.type.should.eql('application/json');
                res.body.email.should.eql('none1@none.com')
                done();
            });
    });
    it('should return an empty email if the submitted email does not exist', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
        });
        chai.request(server)
            .get('/api/userCheck/email/idontexist@none.com')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(200);
                res.type.should.eql('application/json');
                res.body.email.should.eql('');
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
            .get('/api/userCheck/email/idontexist@none.com')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                done();
            });
    });
    it('should return a 401 when not logged in', done => {
        chai.request(server)
            .get('/api/userCheck/email/idontexist@none.com')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                done();
            });
    });
    it('should return a 401 when incorrect api key provided', done => {
        chai.request(server)
            .get('/api/userCheck/email/idontexist@none.com')
            .set('apikey', 'shortkeythatdoesntexist')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                done();
            });
    });
});