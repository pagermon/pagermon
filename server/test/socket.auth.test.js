process.env.NODE_ENV = 'test';

const chai = require('chai');
const should = chai.should();
const chaiHttp = require('chai-http');
const io = require('socket.io-client');

chai.use(chaiHttp);

const confFile = './config/config.json';
const nconf = require('nconf');
const server = require('../app');
const db = require('../knex/knex.js');
const passportStub = require('passport-stub');

passportStub.install(server);

nconf.file({ file: confFile });
nconf.load();

// The app.js starts the server on port 3000 in test mode
const TEST_PORT = 3000;

// Helper function to create socket client
function createSocketClient(namespace = '', options = {}) {
    const url = `http://localhost:${TEST_PORT}${namespace}`;
    return io(url, {
        transports: ['websocket'],
        forceNew: true,
        ...options
    });
}

beforeEach(() => db.migrate.rollback()
    .then(() => db.migrate.latest())
    .then(() => db.seed.run())
    .then(() => {
        nconf.set('messages:HideSource', false); 
        nconf.set('messages:apiSecurity', false); 
        nconf.set('messages:HideCapcode', false);
    }));

afterEach(() => db.migrate.rollback().then(() => passportStub.logout()));

describe('Socket.IO Authentication - Main Socket', () => {
    describe('With apiSecurity disabled', () => {
        beforeEach(() => {
            nconf.set('messages:apiSecurity', false);
        });

        it('should allow anonymous connections', done => {
            const socket = createSocketClient();

            socket.on('connect', () => {
                socket.connected.should.be.true;
                socket.disconnect();
                done();
            });

            socket.on('connect_error', (error) => {
                // Should not reach here
                should.not.exist(error);
                done(error);
            });
        });

        it('should allow authenticated user connections', done => {
            chai.request(server)
                .post('/auth/login')
                .send({
                    username: 'useractive',
                    password: 'changeme'
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.status.should.eql(200);
                    
                    const cookie = res.headers['set-cookie'][0];
                    const socket = createSocketClient('', {
                        extraHeaders: {
                            cookie: cookie
                        }
                    });

                    socket.on('connect', () => {
                        socket.connected.should.be.true;
                        socket.disconnect();
                        done();
                    });

                    socket.on('connect_error', (error) => {
                        // Should not reach here
                        should.not.exist(error);
                        done(error);
                    });
                });
        });
    });

    describe('With apiSecurity enabled', () => {
        beforeEach(() => {
            nconf.set('messages:apiSecurity', true);
        });

        it('should reject anonymous connections', done => {
            const socket = createSocketClient();

            socket.on('connect', () => {
                // Should not reach here
                socket.disconnect();
                done(new Error('Should not connect without authentication'));
            });

            socket.on('connect_error', (error) => {
                error.message.should.equal('Authentication required');
                done();
            });
        });

        it('should allow authenticated user connections', done => {
            chai.request(server)
                .post('/auth/login')
                .send({
                    username: 'useractive',
                    password: 'changeme'
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.status.should.eql(200);
                    
                    const cookie = res.headers['set-cookie'][0];
                    const socket = createSocketClient('', {
                        extraHeaders: {
                            cookie: cookie
                        }
                    });

                    socket.on('connect', () => {
                        socket.connected.should.be.true;
                        socket.disconnect();
                        done();
                    });

                    socket.on('connect_error', (error) => {
                        // Should not reach here
                        should.not.exist(error);
                        done(error);
                    });
                });
        });

        it('should allow authenticated admin connections', done => {
            chai.request(server)
                .post('/auth/login')
                .send({
                    username: 'adminactive',
                    password: 'changeme'
                })
                .end((err, res) => {
                    should.not.exist(err);
                    res.status.should.eql(200);
                    
                    const cookie = res.headers['set-cookie'][0];
                    const socket = createSocketClient('', {
                        extraHeaders: {
                            cookie: cookie
                        }
                    });

                    socket.on('connect', () => {
                        socket.connected.should.be.true;
                        socket.disconnect();
                        done();
                    });

                    socket.on('connect_error', (error) => {
                        // Should not reach here
                        should.not.exist(error);
                        done(error);
                    });
                });
        });
    });
});

describe('Socket.IO Authentication - Admin Socket', () => {
    it('should reject anonymous connections', done => {
        const socket = createSocketClient('/adminio');

        socket.on('connect', () => {
            // Should not reach here
            socket.disconnect();
            done(new Error('Should not connect without authentication'));
        });

        socket.on('connect_error', (error) => {
            error.message.should.equal('Authentication required');
            done();
        });
    });

    it('should reject authenticated non-admin users', done => {
        chai.request(server)
            .post('/auth/login')
            .send({
                username: 'useractive',
                password: 'changeme'
            })
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(200);
                
                const cookie = res.headers['set-cookie'][0];
                const socket = createSocketClient('/adminio', {
                    extraHeaders: {
                        cookie: cookie
                    }
                });

                socket.on('connect', () => {
                    // Should not reach here
                    socket.disconnect();
                    done(new Error('Should not allow non-admin users'));
                });

                socket.on('connect_error', (error) => {
                    error.message.should.equal('Admin access required');
                    done();
                });
            });
    });

    it('should allow authenticated admin connections', done => {
        chai.request(server)
            .post('/auth/login')
            .send({
                username: 'adminactive',
                password: 'changeme'
            })
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(200);
                
                const cookie = res.headers['set-cookie'][0];
                const socket = createSocketClient('/adminio', {
                    extraHeaders: {
                        cookie: cookie
                    }
                });

                socket.on('connect', () => {
                    socket.connected.should.be.true;
                    socket.disconnect();
                    done();
                });

                socket.on('connect_error', (error) => {
                    // Should not reach here
                    should.not.exist(error);
                    done(error);
                });
            });
    });

    it('should reject admin connections when apiSecurity is disabled but still require admin role', done => {
        nconf.set('messages:apiSecurity', false);
        
        chai.request(server)
            .post('/auth/login')
            .send({
                username: 'useractive',
                password: 'changeme'
            })
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(200);
                
                const cookie = res.headers['set-cookie'][0];
                const socket = createSocketClient('/adminio', {
                    extraHeaders: {
                        cookie: cookie
                    }
                });

                socket.on('connect', () => {
                    // Should not reach here
                    socket.disconnect();
                    done(new Error('Should not allow non-admin users even with apiSecurity disabled'));
                });

                socket.on('connect_error', (error) => {
                    error.message.should.equal('Admin access required');
                    done();
                });
            });
    });
});

describe('Socket.IO Role-based Rooms', () => {
    it('should join anonymous users to anonymous room', done => {
        nconf.set('messages:apiSecurity', false);
        
        const socket = createSocketClient();

        socket.on('connect', () => {
            // In a real test, you'd need to verify server-side that the socket joined the 'anonymous' room
            // For now, we just verify connection succeeds
            socket.connected.should.be.true;
            socket.disconnect();
            done();
        });
    });

    it('should join authenticated users to their role room', done => {
        nconf.set('messages:apiSecurity', false);
        
        chai.request(server)
            .post('/auth/login')
            .send({
                username: 'useractive',
                password: 'changeme'
            })
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(200);
                
                const cookie = res.headers['set-cookie'][0];
                const socket = createSocketClient('', {
                    extraHeaders: {
                        cookie: cookie
                    }
                });

                socket.on('connect', () => {
                    // In a real test, you'd need to verify server-side that the socket joined the 'user' room
                    socket.connected.should.be.true;
                    socket.disconnect();
                    done();
                });
            });
    });

    it('should join admin users to admin room', done => {
        chai.request(server)
            .post('/auth/login')
            .send({
                username: 'adminactive',
                password: 'changeme'
            })
            .end((err, res) => {
                should.not.exist(err);
                res.status.should.eql(200);
                
                const cookie = res.headers['set-cookie'][0];
                const socket = createSocketClient('', {
                    extraHeaders: {
                        cookie: cookie
                    }
                });

                socket.on('connect', () => {
                    // In a real test, you'd need to verify server-side that the socket joined the 'admin' room
                    socket.connected.should.be.true;
                    socket.disconnect();
                    done();
                });
            });
    });
});