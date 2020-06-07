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

describe('GET /admin/settingsData', () => {
    it('should return the settings data', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
          });
        chai.request(server)
                    .get('/admin/settingsData')
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(200);
                            res.type.should.eql('application/json');
                            res.body.should.have.property('settings')
                            res.body.should.have.property('plugins')
                            res.body.should.have.property('themes')
                            done();
                    });
    });
    it('should return the index if not admin', done => {
        passportStub.login({
            username: 'useractive',
            password: 'changeme'
          });
        chai.request(server)
                    .get('/admin/settingsData')
                    .redirects(0)
                    .end((err, res) => {
                        should.not.exist(err);
                        res.status.should.eql(302);
                        res.should.redirectTo('/')
                        done();
                    });
    });
    it('should return the index if not logged in', done => {
        chai.request(server)
                    .get('/admin/settingsData')
                    .redirects(0)
                    .end((err, res) => {
                        should.not.exist(err);
                        res.status.should.eql(302);
                        res.should.redirectTo('/')
                        done();
                    });
    });
});  

describe('POST /admin/settingsData', () => {
    it('should save the settings data', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
          });
        chai.request(server)
                    .post('/admin/settingsData')
                    .send({
                            "global": {
                              "loglevel": "debug",
                              "sessionSecret": "1DVETLX8VE007RYQN9TN9Z00",
                              "frontPopupEnable": false,
                              "frontPopupTitle": "",
                              "frontPopupContent": "",
                              "searchLocation": "bottom",
                              "theme": "default",
                              "monitorName": "PagerMon"
                            },
                            "database": {
                              "file": "./messages.db",
                              "type": "sqlite3"
                            },
                            "messages": {
                              "maxLimit": 120,
                              "defaultLimit": 20,
                              "duplicateFiltering": true,
                              "duplicateLimit": 10,
                              "duplicateTime": 60,
                              "rotationEnabled": true,
                              "rotateDays": 7,
                              "rotateKeep": 4,
                              "replaceText": [
                                {
                                  "match": "firecall",
                                  "replace": "This is a call about fires"
                                },
                                {
                                  "match": "alert",
                                  "highlight": true,
                                  "replace": ""
                                }
                              ],
                              "pdwMode": false,
                              "adminShow": false,
                              "HideCapcode": false,
                              "HideSource": false,
                              "apiSecurity": false
                            },
                            "auth": {
                              "registration": true,
                              "user": "admin",
                              "encPass": "$2a$08$De/aXnQkZIEbQ9p8J22tHuzLltqIbsAxE2CGgRMPLaaIwwHmVrpsu",
                              "keys": [
                                {
                                  "name": "example1",
                                  "key": "reallylongkeythatneedstobechanged",
                                  "selected": false
                                },
                                {
                                  "name": "example2",
                                  "key": "whydoyouneedtwokeys"
                                }
                              ]
                            },
                            "monitoring": {
                              "azureEnable": false,
                              "azureKey": "",
                              "gaEnable": false,
                              "gaTrackingCode": ""
                            },
                            "plugins": {}
                    })
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(200);
                            res.body.status.should.eql('ok');
                            res.type.should.eql('application/json');
                            done();
                    });
    });
    it('should not save the settings for non-admins', done => {
        passportStub.login({
            username: 'useractive',
            password: 'changeme'
          });
        chai.request(server)
                    .post('/admin/settingsData')
                    .redirects(0)
                    .send({
                            "global": {
                              "loglevel": "debug",
                              "sessionSecret": "1DVETLX8VE007RYQN9TN9Z00",
                              "frontPopupEnable": false,
                              "frontPopupTitle": "",
                              "frontPopupContent": "",
                              "searchLocation": "bottom",
                              "theme": "default",
                              "monitorName": "PagerMon"
                            },
                            "database": {
                              "file": "./messages.db",
                              "type": "sqlite3"
                            },
                            "messages": {
                              "maxLimit": 120,
                              "defaultLimit": 20,
                              "duplicateFiltering": true,
                              "duplicateLimit": 10,
                              "duplicateTime": 60,
                              "rotationEnabled": true,
                              "rotateDays": 7,
                              "rotateKeep": 4,
                              "replaceText": [
                                {
                                  "match": "firecall",
                                  "replace": "This is a call about fires"
                                },
                                {
                                  "match": "alert",
                                  "highlight": true,
                                  "replace": ""
                                }
                              ],
                              "pdwMode": false,
                              "adminShow": false,
                              "HideCapcode": false,
                              "HideSource": false,
                              "apiSecurity": false
                            },
                            "auth": {
                              "registration": true,
                              "user": "admin",
                              "encPass": "$2a$08$De/aXnQkZIEbQ9p8J22tHuzLltqIbsAxE2CGgRMPLaaIwwHmVrpsu",
                              "keys": [
                                {
                                  "name": "example1",
                                  "key": "reallylongkeythatneedstobechanged",
                                  "selected": false
                                },
                                {
                                  "name": "example2",
                                  "key": "whydoyouneedtwokeys"
                                }
                              ]
                            },
                            "monitoring": {
                              "azureEnable": false,
                              "azureKey": "",
                              "gaEnable": false,
                              "gaTrackingCode": ""
                            },
                            "plugins": {}
                    })
                    .end((err, res) => {
                        should.not.exist(err);
                        res.status.should.eql(302);
                        res.should.redirectTo('/')
                        done();
                    });
    });
});  

describe('GET /admin/*', () => {
    it('should return the admin page when admin is logged in', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
          });
        chai.request(server)
                    .get('/admin/admin')
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(200);
                            res.type.should.eql('text/html');
                            done();
                    });
    });
    it('should return the index page instead of admin page when user is logged in', done => {
        passportStub.login({
            username: 'useractive',
            password: 'changeme'
          });
        chai.request(server)
                    .get('/admin/admin')
                    .redirects(0)
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(302);
                            res.should.redirectTo('/')
                            done();
                    });
    });
    it('should return the index page instead of admin page when not logged in', done => {
        chai.request(server)
                    .get('/admin/admin')
                    .redirects(0)
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(302);
                            res.should.redirectTo('/')
                            done();
                    });
    });
    it('should return the aliases page when admin is logged in', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
          });
        chai.request(server)
                    .get('/admin/aliases')
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(200);
                            res.type.should.eql('text/html');
                            done();
                    });
    });
    it('should return the index page instead of aliases page when user is logged in', done => {
        passportStub.login({
            username: 'useractive',
            password: 'changeme'
          });
        chai.request(server)
                    .get('/admin/aliases')
                    .redirects(0)
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(302);
                            res.should.redirectTo('/')
                            done();
                    });
    });
    it('should return the index page instead of aliases page when not logged in', done => {
        chai.request(server)
                    .get('/admin/aliases')
                    .redirects(0)
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(302);
                            res.should.redirectTo('/')
                            done();
                    });
    });
    it('should return the users page when admin is logged in', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
          });
        chai.request(server)
                    .get('/admin/users')
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(200);
                            res.type.should.eql('text/html');
                            done();
                    });
    });
    it('should return the index page instead of users page when user is logged in', done => {
        passportStub.login({
            username: 'useractive',
            password: 'changeme'
          });
        chai.request(server)
                    .get('/admin/users')
                    .redirects(0)
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(302);
                            res.should.redirectTo('/')
                            done();
                    });
    });
    it('should return the index page instead of users page when not logged in', done => {
        chai.request(server)
                    .get('/admin/users')
                    .redirects(0)
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(302);
                            res.should.redirectTo('/')
                            done();
                    });
    });
    it('should return the userDetails page when admin is logged in', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
          });
        chai.request(server)
                    .get('/admin/users/1')
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(200);
                            res.type.should.eql('text/html');
                            done();
                    });
    });
    it('should return the index page instead of userDetails page when user is logged in', done => {
        passportStub.login({
            username: 'useractive',
            password: 'changeme'
          });
        chai.request(server)
                    .get('/admin/users/1')
                    .redirects(0)
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(302);
                            res.should.redirectTo('/')
                            done();
                    });
    });
    it('should return the index page instead of userDetails page when not logged in', done => {
        chai.request(server)
                    .get('/admin/users/1')
                    .redirects(0)
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(302);
                            res.should.redirectTo('/')
                            done();
                    });
    });
    it('should return the settings page when admin is logged in', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
          });
        chai.request(server)
                    .get('/admin/settings')
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(200);
                            res.type.should.eql('text/html');
                            done();
                    });
    });
    it('should return the index page instead of settings page when user is logged in', done => {
        passportStub.login({
            username: 'useractive',
            password: 'changeme'
          });
        chai.request(server)
                    .get('/admin/settings')
                    .redirects(0)
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(302);
                            res.should.redirectTo('/')
                            done();
                    });
    });
    it('should return the index page instead of settings page when not logged in', done => {
        chai.request(server)
                    .get('/admin/settings')
                    .redirects(0)
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(302);
                            res.should.redirectTo('/')
                            done();
                    });
    });
    it('should return the aliasDetails page when admin is logged in', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
          });
        chai.request(server)
                    .get('/admin/aliases/1')
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(200);
                            res.type.should.eql('text/html');
                            done();
                    });
    });
    it('should return the index page instead of aliasDetails page when user is logged in', done => {
        passportStub.login({
            username: 'useractive',
            password: 'changeme'
          });
        chai.request(server)
                    .get('/admin/aliases/1')
                    .redirects(0)
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(302);
                            res.should.redirectTo('/')
                            done();
                    });
    });
    it('should return the index page instead of aliasDetails page when not logged in', done => {
        passportStub.login({
            username: 'useractive',
            password: 'changeme'
          });
        chai.request(server)
                    .get('/admin/aliases/1')
                    .redirects(0)
                    .end((err, res) => {
                            should.not.exist(err);
                            res.status.should.eql(302);
                            res.should.redirectTo('/')
                            done();
                    });
    });

});

