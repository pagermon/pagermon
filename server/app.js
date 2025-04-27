/* eslint-disable no-console */
const version = '0.4.0-beta';

const { CronJob } = require('cron');
const bodyParser = require('body-parser');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const cronvalidate = require('cron-validator');
const express = require('express');
const favicon = require('serve-favicon');
const flash = require('connect-flash');
const fs = require('fs');
const http = require('http');
const nconf = require('nconf');
const path = require('path');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const performCapcodeRefresh = require('./routes/api/capcodes.js').performCapcodeRefresh;

const logger = require('./log');
const passport = require('./auth/local');

process.on('SIGINT', function () {
        console.log('\nGracefully shutting down from SIGINT (Ctrl-C)');
        process.exit(1);
});

// create config file if it does not exist, and set defaults
const defaultConfiguration = require('./config/default.json');

const confFile = './config/config.json';
if (!fs.existsSync(confFile)) {
        fs.writeFileSync(confFile, JSON.stringify(defaultConfiguration, null, 2));
}

// load the config file
nconf.file({ file: confFile });
nconf.defaults(defaultConfiguration);
nconf.load();

// Load current theme
const theme = nconf.get('global:theme');

// Enable Azure Monitoring if enabled
const azureEnable = nconf.get('monitoring:azureEnable');
if (azureEnable) {
        const appInsights = require('applicationinsights');

        logger.main.debug('Starting Azure Application Insights');
        const azureKey = nconf.get('monitoring:azureKey');
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

require('@pm2/io').init({
        http: true, // HTTP routes logging (default: true)
        ignore_routes: [/socket\.io/, /notFound/], // Ignore http routes with this pattern (Default: [])
        errors: true, // Exceptions logging (default: true)
        custom_probes: true, // Auto expose JS Loop Latency and HTTP req/s as custom metrics
        network: true, // Network monitoring at the application level
        ports: true, // Shows which ports your app is listening on (default: false)
        transactions: true,
});

checkForDbDriver(nconf.get('database:type'));
require('./db').init();

const dbtype = nconf.get('database:type');
// Set the database port if none found, for backwards compatibility
if ((dbtype === 'pg' || dbtype === 'mysql' || dbtype === 'mssql') && !nconf.get('database:port')) {
        nconf.set('database:port', 3306);
        nconf.save();
}

const port = normalizePort(process.env.PORT || '3000');
const app = express();

app.set('port', port);
// view engine setup
app.set('views', path.join(__dirname, 'themes', theme, 'views'));
app.set('view engine', 'ejs');
app.set('trust proxy', 'loopback, linklocal, uniquelocal');

const server = http.createServer(app);
const socketIo = require('socket.io')(server);

server.listen(port);
server.on('error', (error) => {
        {
                if (error.syscall !== 'listen') {
                        throw error;
                }

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
});
server.on('listening', () => {
        const addr = server.address();
        const bind = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
        logger.main.info(`Listening on ${bind}`);
});
// Set connection timeout to prevent long running queries failing on large databases - mostly capacode refresh on MySQL
server.on('connection', function (connection) {
        connection.setTimeout(600 * 1000);
});
// Lets set setMaxListeners to a decent number - not to high to allow the memory leak warking to still trigger
socketIo.sockets.setMaxListeners(20);

// Lets set setMaxListeners to a decent number - not to high to allow the memory leak warking to still trigger
/*     io.sockets.setMaxListeners(20);
    io.sockets.on('connection', function(socket) {
            logger.main.debug(`User with group connected to socket`);
            const userGroup = socket.request?.user?.group || 'anonymous';
            socket.join(userGroup)
            socket.removeAllListeners();
    }); */

socketIo.sockets.on('connection', function (socket) {
        socket.removeAllListeners();
        const userGroup = socket.request?.user?.role || 'anonymous';
        socket.join(userGroup);
});

app.use(favicon(path.join(__dirname, 'themes', theme, 'public', 'favicon.ico')));

// set socket.io to be shared across all modules
app.use(function (req, res, next) {
        req.io = socketIo;
        next();
});

// session secret is controlled by config
const secret = nconf.get('global:sessionSecret');
// compress all responses
app.use(compression());
app.use(require('morgan')('combined', { stream: logger.http.stream }));

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
        resave: true,
        secret,
};

if (process.env.HOSTNAME && process.env.USE_COOKIE_HOST) sessionSettings.cookie.domain = `.${process.env.HOSTNAME}`;

app.use(session(sessionSettings));

app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash());
app.use(express.static(path.join(__dirname, 'themes', theme, 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.use(function (req, res, next) {
        res.locals.version = version;
        res.locals.loglevel = nconf.get('global:loglevel') || 'info';
        next();
});

const wrapMiddleware = (middleware) => (socket, next) => middleware(socket.request, {}, next);
socketIo.use(wrapMiddleware(session(sessionSettings)));
socketIo.use(wrapMiddleware(passport.session()));
socketIo.of('/adminio').use(wrapMiddleware(session(sessionSettings)));
socketIo.of('adminio').use(wrapMiddleware(passport.session()));

// routes
const indexRouter = require('./routes/index');
const adminRouter = require('./routes/admin');
const apiRouter = require('./routes/api/index.js');
const authRouter = require('./routes/auth');

app.use('/', indexRouter);
app.use('/admin', adminRouter);
app.use('/post', apiRouter); // TODO: Why do we need it?
app.use('/api', apiRouter);
app.use('/auth', authRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
        const err = new Error('Not Found');
        err.status = 404;
        next(err);
});

// GUI error handler
app.use(function (err, req, res, next) {
        const title = nconf.get('global:monitorName');
        // set locals, only providing error in development
        res.locals.message = err.message;
        res.locals.error = req.app.get('env') === 'development' ? err : {};
        // these 3 have to be here to stop the error handler shitting up the logs with undefined references when it receives a 500 error ... nfi why
        res.locals.login = req.isAuthenticated();
        res.locals.gaEnable = nconf.get('monitoring:gaEnable');
        res.locals.monitorName = nconf.get('global:monitorName');
        res.locals.register = nconf.get('auth:registration');

        // render the error page
        res.status(err.status || 500);
        res.render(path.join(__dirname, 'themes', theme, 'views', 'global', 'error'), { title });
});

// Add cronjob to automatically refresh aliases
if (dbtype === 'mysql') {
        // Get CRON from config
        let cronartime = nconf.get('database:aliasRefreshInterval');

        // Check value isn't garbage, if it is set to default
        if (!cronvalidate.isValidCron(cronartime, { seconds: true })) {
                logger.main.warn('CRON: Invalid CRON configuration in config file. Defaulting to: "0 5,35 * * * *" ');
                cronartime = '0 5,35 * * * *';
        }
        CronJob.from(
                cronartime,
                async () => {
                        try {
                                logger.main.debug('CRON: Running Cronjob AliasRefresh');
                                if (!nconf.get('database:aliasRefreshRequired'))
                                        return logger.main.debug('CRON: Alias Refresh not Required, Skipping.');

                                logger.main.info('CRON: Alias Refresh required, running.');
                                await performCapcodeRefresh();

                                nconf.set('database:aliasRefreshRequired', 0);
                                nconf.save();
                                logger.main.info('CRON: Alias Refresh Successful');
                        } catch (error) {
                                logger.main.error(`CRON: Error refreshing aliases: ${error.message}`);
                        }
                },
                null,
                true
        );
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
        const parsedPort = parseInt(val, 10);
        if (Number.isNaN(parsedPort)) return val;
        if (parsedPort < 0) return false;
        return parsedPort;
}

function checkForDbDriver(driver) {
        switch (driver) {
                case 'sqlite3': {
                        try {
                                require('sqlite3');
                        } catch {
                                logger.main.error(
                                        `Selected database type is sqlite3, but npm package sqlite3 was not installed.`
                                );
                                logger.main.error(
                                        `Please run npm i sqlite3 to install or refer to https://www.npmjs.com/package/sqlite3 for reference`
                                );
                                process.exit(1);
                        }
                        break;
                }
                case 'mysql': {
                        try {
                                require('knex');
                        } catch {
                                logger.main.error(
                                        `Selected database type is mysql, but npm package knex was not installed.`
                                );
                                logger.main.error(
                                        `Please run npm i knex to install or refer to https://www.npmjs.com/package/knex for reference`
                                );
                                process.exit(1);
                        }
                        break;
                }
                case 'oracledb': {
                        try {
                                require('oracledb');
                        } catch {
                                logger.main.error(
                                        `Selected database type is oracledb, but npm package oracledb was not installed.`
                                );
                                logger.main.error(
                                        `Please run npm i oracledb to install or refer to https://www.npmjs.com/package/oracledb for reference`
                                );
                                process.exit(1);
                        }
                        break;
                }
                default: {
                        logger.main.error(`No database type was specified.`);
                        process.exit(1);
                }
        }
}
