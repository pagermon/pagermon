process.env.NODE_ENV = 'test';

const chai = require('chai');
const should = chai.should();
const chaiHttp = require('chai-http');
chai.use(chaiHttp);

const server = require('../app');
var db = require('../knex/knex.js');
//This needs to be sorted out, use a different config file when testing?
var conf_file = './config/config.json';
// load the config file
var nconf = require('nconf');
    nconf.file({file: conf_file});
    nconf.load();
// set required settings in config file
nconf.set('auth:registration', true);
nconf.save();

describe('GET /auth/register', () => {
  it('should return the registration page if enabled', (done) => {
      chai
        .request(server)
        .get('/auth/register')
        .end((err, res) => {
          should.not.exist(err);
          res.status.should.eql(200);
          res.type.should.eql('text/html');
          done();
        });
    });
    it('should not return the registration page if disabled', (done) => {
      chai
        .request(server)
        .get('/auth/register')
        .redirects(0)
        .end((err, res) => {
          should.not.exist(err);
          res.status.should.eql(200);
          res.redirectTo.should.eql('/')
          res.type.should.eql('text/html');
          done();
        });
    });
  });

describe('POST /auth/register', () => {
  beforeEach(() => {
    return db.migrate.rollback()
    .then(() => { return db.migrate.latest(); });
  });

  afterEach(() => {
    return db.migrate.rollback();
  });
  it('should register a new user', (done) => {
      chai
        .request(server)
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
    it('should not register a duplicate user', (done) => {
      chai
        .request(server)
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
  });