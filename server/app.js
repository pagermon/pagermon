const version = '0.3.11-beta';

const config = require('./config');

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const debug = require('debug')('pagermon:server');
const db = require('./knex/knex.js');
const dbinit = require('./db');
const express = require('express');
const favicon = require('serve-favicon');
const flash = require('connect-flash');
const http = require('http');
const logger = require('./log');
const morgan = require('morgan');
const passport = require('./auth/local');
const path = require('path');
const session = require('express-session');
const socketio = require('socket.io');
const SQLiteStore = require('connect-sqlite3')(session);

// TODO: variable io is never used, but later overwritten by socket.io
/* var io = require('@pm2/io').init({
    http          : true, // HTTP routes logging (default: true)
    ignore_routes : [/socket\.io/, /notFound/], // Ignore http routes with this pattern (Default: [])
    errors        : true, // Exceptions logging (default: true)
    custom_probes : true, // Auto expose JS Loop Latency and HTTP req/s as custom metrics
    network       : true, // Network monitoring at the application level
    ports         : true,  // Shows which ports your app is listening on (default: false)
    transactions  : true
});
 */

process.on('SIGINT', function() {
        console.log('\nGracefully shutting down from SIGINT (Ctrl-C)');
        process.exit(1);
});

// TODO: extract to seperate component
// Enable Azure Monitoring if enabled
if (config.get('monitoring:azureEnable')) {
        const azureKey = config.get('monitoring:azureKey');
        logger.main.debug('Starting Azure Application Insights');
        // eslint-disable-next-line global-require
        const appInsights = require('applicationinsights');

        appInsights
                .setup(azureKey)
                .setAutoDependencyCorrelation(true)
                .setAutoCollectRequests(true)
                .setAutoCollectPerformance(true)
                .setAutoCollectExceptions(true)
                .setAutoCollectDependencies(true)
                .setAutoCollectConsole(true)
                .setUseDiskRetryCaching(true)
                .start();
}

dbinit.init({ logger, db, config });

const port = normalizePort(config.any('port', 'PORT'));

const app = express();

app.set('port', port);
// view engine setup
app.set('views', path.join(__dirname, 'themes', config.get('global:theme'), 'views'));
app.set('view engine', 'ejs');
app.set('trust proxy', 'loopback, linklocal, uniquelocal');

const server = http.createServer(app);
const ioServer = socketio.listen(server);

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

// Set connection timeout to prevent long running queries failing on large databases - mostly capacode refresh on MySQL
server.on('connection', function(connection) {
        connection.setTimeout(600 * 1000);
});
// Lets set setMaxListeners to a decent number - not to high to allow the memory leak warking to still trigger
ioServer.sockets.setMaxListeners(20);
ioServer.sockets.on('connection', function(socket) {
        socket.removeAllListeners();
        debug('client connect to normal socket');
        // TODO: What is it, and do we need it?
        //    socket.on('echo', function (data) {
        //        io.sockets.emit('message', data);
        //        console.log('message', data);
        //    });
});

// Admin Socket
const adminSocket = ioServer.of('/adminio');
adminSocket.on('connection', function(socket) {
        socket.removeAllListeners();
        debug('client connect to admin socket');
        // TODO: Same here
        //    adminio.on('echo', function (data) {
        //        adminio.emit('message', data);
        //        console.log('message', data);
        //    });
});

app.use(favicon(path.join(__dirname, 'themes', config.get('global:theme'), 'public', 'favicon.ico')));

// set socket.io to be shared across all modules
app.use(function(req, res, next) {
        req.io = ioServer;
        next();
});

// compress all responses
app.use(compression());
app.use(morgan('combined', { stream: logger.http.stream }));
app.use(
        bodyParser.json({
                limit: '1mb',
        })
); // to support JSON-encoded bodies

app.use(
        bodyParser.urlencoded({
                extended: true,
                limit: '1mb',
        })
); // to support URL-encoded bodies

app.use(cookieParser());

const sessionSettings = {
        cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 1 week
        store: new SQLiteStore(),
        saveUninitialized: true,
        resave: 'true',
        secret: config.get('global:sessionSecret'),
};

if (process.env.HOSTNAME && process.env.USE_COOKIE_HOST) sessionSettings.cookie.domain = `.${process.env.HOSTNAME}`;

app.use(session(sessionSettings));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash());
app.use(express.static(path.join(__dirname, 'themes', config.get('global:theme'), 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.use(function(req, res, next) {
        res.locals.version = version;
        res.locals.loglevel = config.get('global:loglevel') || 'info';
        next();
});

// Import and add routes
const routes = require('./routes/index');

app.use('/', routes.indexRoute);
app.use('/admin', routes.adminRoute);
app.use('/post', routes.apiRoute);
app.use('/api', routes.apiRoute);
app.use('/auth', routes.authRoute);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
        var err = new Error('Not Found');
        err.status = 404;
        next(err);
});

// error handler
app.use(function(err, req, res, next) {
        // set locals, only providing error in development
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};
        // these 3 have to be here to stop the error handler shitting up the logs with undefined references when it receives a 500 error ... nfi why
        res.locals.login = req.isAuthenticated();
        res.locals.gaEnable = config.get('monitoring:gaEnable');
        res.locals.monitorName = config.get('global:monitorName');
        res.locals.register = config.get('auth:registration');

        // render the error page
        res.status(err.status || 500);
        res.render(path.join(__dirname, 'themes', config.get('global:theme'), 'views', 'global', 'error'), {
                title: config.get('global:monitorName'),
        });
});

// Add cronjob to automatically refresh aliases
const dbtype = config.get('database:type');
if (dbtype === 'mysql') {
        /* eslint-disable global-require, no-new */
        const AliasRefreshJob = require('cron').CronJob;
        new AliasRefreshJob(
                '0 5,35 * * * *',
                function() {
                        const refreshRequired = config.get('database:aliasRefreshRequired');
                        logger.main.debug('CRON: Running Cronjob AliasRefresh');

                        if (refreshRequired === 1) {
                                console.time('updateMap');
                                logger.main.info('CRON: Alias Refresh required, running.');
                                db('messages')
                                        .update('alias_id', function() {
                                                this.select('id')
                                                        .select('id')
                                                        .from('capcodes')
                                                        .where(
                                                                db.ref('messages.address'),
                                                                'like',
                                                                db.ref('capcodes.address')
                                                        )
                                                        .orderByRaw("REPLACE(address, '_', '%') DESC LIMIT 1");
                                        })
                                        .then(() => {
                                                console.timeEnd('updateMap');
                                                config.set('database:aliasRefreshRequired', 0);
                                                config.save();
                                                logger.main.info('CRON: Alias Refresh Successful');
                                        })
                                        .catch(err => {
                                                logger.main.error(`CRON: Error refreshing aliases ${err}`);
                                                console.timeEnd('updateMap');
                                        });
                        } else {
                                logger.main.debug('CRON: Alias Refresh not Required, Skipping.');
                        }
                },
                null,
                true
        );
        /* eslint-enable global-require, no-new */
}

// Disable all logging for tests
if (process.env.NODE_ENV === 'test') {
        logger.main.silent = true;
        logger.auth.silent = true;
        logger.db.silent = true;
        logger.http.silent = true;
}

module.exports = app;

function normalizePort(val) {
        const portToNormalize = parseInt(val, 10);

        if (Number.isNaN(portToNormalize))
                // named pipe
                return val;

        if (portToNormalize >= 0)
                // port number
                return portToNormalize;

        return false;
}

function onError(error) {
        if (error.syscall !== 'listen') throw error;

        const bind = typeof port === 'string' ? `Pipe ${port}` : `Port ${port}`;

        // handle specific listen errors with friendly messages
        switch (error.code) {
                case 'EACCES':
                        console.error(`${bind} requires elevated privileges`);
                        process.exit(1);
                        break;
                case 'EADDRINUSE':
                        console.error(`${bind} is already in use`);
                        process.exit(1);
                        break;
                default:
                        throw error;
        }
}

function onListening() {
        var addr = server.address();
        var bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
        logger.main.info(`Listening on ${bind}`);
}
