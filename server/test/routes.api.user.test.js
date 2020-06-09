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

describe('POST /api/user', () => {
    it('should create a new user', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
        });
        chai.request(server)
            .post('/api/user')
            .send({
                username: 'idontexist',
                email: 'idontexist@fake.com',
                givenname: 'Dude',
                password: 'changeme',
                status: 'active',
                role: 'admin'
            })
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(200);
                res.body.status.should.eql('ok')
                res.body.id.should.eql(5)
                res.type.should.eql('application/json');
                done();
            });
    });  
    it('should return a 400 if required fields are missing', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
        });
        chai.request(server)
            .post('/api/user')
            .send({
                username: 'idontexist',
                email: 'idontexist@fake.com',
            })
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(400);
                res.body.status.should.eql('error')
                res.body.error.should.eql('Invalid request body')
                res.type.should.eql('application/json');
                done();
            });
    });  
    it('should return a 400 if username is in use', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
        });
        chai.request(server)
            .post('/api/user')
            .send({
                username: 'useractive',
                email: 'idontexist@fake.com',
                givenname: 'Dude',
                password: 'changeme',
                role: 'user',
                status:'active'
            })
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(400);
                res.body.status.should.eql('error')
                res.body.error.should.eql('Username or Email exists')
                res.type.should.eql('application/json');
                done();
            });
    });  
    it('should return a 400 if email is in use', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
        });
        chai.request(server)
            .post('/api/user')
            .send({
                username: 'useractive',
                email: 'idontexist@fake.com',
                givenname: 'Dude',
                password: 'changeme',
                status: 'active',
                role: 'user'
            })
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(400);
                res.body.status.should.eql('error')
                res.body.error.should.eql('Username or Email exists')
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
            .post('/api/user')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                done();
            });
    });
    it('should return a 401 when not logged in', done => {
        chai.request(server)
            .post('/api/user')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                done();
            });
    });
    it('should return a 401 when incorrect api key provided', done => {
        chai.request(server)
            .post('/api/user')
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
                res.body.id.should.eql(2)
                res.body.should.have.property('givenname')
                res.body.givenname.should.eql('Active')
                res.body.should.have.property('surname')
                res.body.surname.should.eql('User')
                res.body.should.have.property('username')
                res.body.username.should.eql('useractive')
                res.body.should.have.property('email')
                res.body.email.should.eql('none1@none.com')
                res.body.should.have.property('role')
                res.body.role.should.eql('user')
                res.body.should.have.property('status')
                res.body.status.should.eql('active')
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
                res.body.givenname.should.eql('')
                res.body.should.have.property('surname')
                res.body.surname.should.eql('')
                res.body.should.have.property('username')
                res.body.username.should.eql('')
                res.body.should.have.property('email')
                res.body.email.should.eql('')
                res.body.should.have.property('role')
                res.body.role.should.eql('user')
                res.body.should.have.property('status')
                res.body.status.should.eql('active')
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
                res.body.id.should.eql(2)
                res.body.should.have.property('givenname')
                res.body.givenname.should.eql('Active')
                res.body.should.have.property('surname')
                res.body.surname.should.eql('User')
                res.body.should.have.property('username')
                res.body.username.should.eql('useractive')
                res.body.should.have.property('email')
                res.body.email.should.eql('none1@none.com')
                res.body.should.have.property('role')
                res.body.role.should.eql('user')
                res.body.should.have.property('status')
                res.body.status.should.eql('active')
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
                res.body.givenname.should.eql('')
                res.body.should.have.property('surname')
                res.body.surname.should.eql('')
                res.body.should.have.property('username')
                res.body.username.should.eql('')
                res.body.should.have.property('email')
                res.body.email.should.eql('')
                res.body.should.have.property('role')
                res.body.role.should.eql('user')
                res.body.should.have.property('status')
                res.body.status.should.eql('active')
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

describe('POST /api/user/:id', () => {
    it('should create a new user when admin', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
        });
        chai.request(server)
            .post('/api/user/new')
            .send({
                username: 'idontexist',
                email: 'idontexist@fake.com',
                givenname: 'Dude',
                password: 'changeme',
                status: 'active',
                role: 'admin'
            })
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(200);
                res.body.status.should.eql('ok')
                res.body.id.should.eql(5)
                res.type.should.eql('application/json');
                done();
            });
    });  
    it('should create a new user when apikey provided', done => {
        chai.request(server)
            .post('/api/user/new')
            .set('apikey', 'reallylongkeythatneedstobechanged')
            .send({
                username: 'idontexist',
                email: 'idontexist@fake.com',
                givenname: 'Dude',
                password: 'changeme',
                status: 'active',
                role: 'admin'
            })
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(200);
                res.body.status.should.eql('ok')
                res.body.id.should.eql(5)
                res.type.should.eql('application/json');
                done();
            });
    });  
    it('should 400 when creating a user without a password', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
        });
        chai.request(server)
            .post('/api/user/new')
            .send({
                username: 'idontexist',
                email: 'idontexist@fake.com',
                givenname: 'Dude',
                status: 'active',
                role: 'admin'
            })
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(400);
                res.body.status.should.eql('error')
                res.body.error.should.eql('Error - required field missing')
                res.type.should.eql('application/json');
                done();
            });
    });  
    it('should 400 when creating a user without required properties', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
        });
        chai.request(server)
            .post('/api/user/new')
            .send({
                email: 'idontexist@fake.com',
                givenname: 'Dude',
                password: 'changeme',
                status: 'active',
                role: 'admin'
            })
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(400);
                res.body.status.should.eql('error')
                res.body.error.should.eql('Error - required field missing')
                res.type.should.eql('application/json');
                done();
            });
    });  
    it('should update a user when admin', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
        });
        chai.request(server)
            .post('/api/user/2')
            .send({
                email: 'none1@none.com',
                givenname: 'User',
                username: 'useractive2',
            })
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(200);
                res.body.status.should.eql('ok')
                res.type.should.eql('application/json');
                done();
            });
    });  
    it('should update a user when apikey provided', done => {
        chai.request(server)
            .post('/api/user/2')
            .set('apikey', 'reallylongkeythatneedstobechanged')
            .send({
                email: 'none1@none.com',
                givenname: 'User',
                username: 'useractive2',
            })
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(200);
                res.body.status.should.eql('ok')
                res.type.should.eql('application/json');
                done();
            });
    });  
    it('should update a user including password when admin', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
        });
        chai.request(server)
            .post('/api/user/2')
            .send({
                email: 'none1@none.com',
                givenname: 'User',
                username: 'useractive2',
                password: 'changeme'
            })
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(200);
                res.body.status.should.eql('ok')
                res.type.should.eql('application/json');
                done();
            });
    });
    it('should update a user including password when apikey provided', done => {
        chai.request(server)
            .post('/api/user/2')
            .set('apikey', 'reallylongkeythatneedstobechanged')
            .send({
                email: 'none1@none.com',
                givenname: 'User',
                username: 'useractive2',
                password: 'changeme2'
            })
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(200);
                res.body.status.should.eql('ok')
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
            .post('/api/user/new')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                done();
            });
    });
    it('should return a 401 when not logged in', done => {
        chai.request(server)
            .post('/api/user/new')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                done();
            });
    });
    it('should return a 401 when incorrect api key provided', done => {
        chai.request(server)
            .post('/api/user/new')
            .set('apikey', 'shortkeythatdoesntexist')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                done();
            });
    });
});

describe('DELETE /api/user/:id', () => {
    it('should delete a user when logged in as admin', done => {
        passportStub.login({
            username: 'adminactive',
            password: 'changeme',
            role: 'admin'
        });
        chai.request(server)
            .delete('/api/user/2')
            .end((err, res) => {
                res.status.should.eql(200);
                res.body.status.should.eql('ok')
                done();
            });
    });
    it('should delete a user when api key is provided', done => {
        chai.request(server)
            .delete('/api/user/2')
            .set('apikey', 'reallylongkeythatneedstobechanged')
            .end((err, res) => {
                res.status.should.eql(200);
                res.body.status.should.eql('ok')
                done();
            });
    });
    it('should not allow deleting of user ID 1', done => {
        chai.request(server)
            .delete('/api/user/1')
            .set('apikey', 'reallylongkeythatneedstobechanged')
            .end((err, res) => {
                res.status.should.eql(400);
                res.body.error.should.eql('User ID 1 is protected')
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
            .delete('/api/user/2')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                done();
            });
    });
    it('should return a 401 when not logged in', done => {
        chai.request(server)
            .delete('/api/user/2')
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(401);
                res.type.should.eql('application/json');
                done();
            });
    });
    it('should return a 401 when incorrect api key provided', done => {
        chai.request(server)
            .delete('/api/user/2')
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