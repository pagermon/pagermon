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

describe('GET /', () => {
    it('should return the home page', done => {
        nconf.set('messages:apiSecurity', false)    
        nconf.save();
        chai.request(server)
                    .get('/')
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(200);
                            res.type.should.eql('text/html');
                            done();
                    });
    });
    it('should return the index if a user is logged in and apiSecurity enabled', done => {
        nconf.set('messages:apiSecurity', true)    
        nconf.save();    
        passportStub.login({
                    username: 'useractive',
                    password: 'changeme'
                  });
            chai.request(server)
                    .get('/')
                    .end((err, res) => {
                        should.not.exist(err);
                        res.status.should.eql(200);
                        res.type.should.eql('text/html');
                        nconf.set('messages:apiSecurity', false)    
                        nconf.save();
                        done();
                    });
    });
    it('should return the login if a user is not logged in and apiSecurity enabled', done => {
        nconf.set('messages:apiSecurity', true)    
        nconf.save();    
            chai.request(server)
                    .get('/')
                    .redirects(0)
                    .end((err, res) => {
                        should.not.exist(err);
                        res.should.redirectTo('/auth/login')
                        nconf.set('messages:apiSecurity', false)    
                        nconf.save();
                        done();
                    });
    });
});