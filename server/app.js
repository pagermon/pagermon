var version = "0.1.7-beta";

var debug = require('debug')('pagermon:server');
var pmx = require('pmx').init({
    http          : true, // HTTP routes logging (default: true)
    ignore_routes : [/socket\.io/, /notFound/], // Ignore http routes with this pattern (Default: [])
    errors        : true, // Exceptions logging (default: true)
    custom_probes : true, // Auto expose JS Loop Latency and HTTP req/s as custom metrics
    network       : true, // Network monitoring at the application level
    ports         : true  // Shows which ports your app is listening on (default: false)
});
var http = require('http');
var compression = require('compression');
var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var fs = require('fs');
var session = require('express-session');
var SQLiteStore = require('connect-sqlite3')(session);
var passport = require('passport');
var flash    = require('connect-flash');
require('./config/passport')(passport);

process.on('SIGINT', function() {
    console.log( "\nGracefully shutting down from SIGINT (Ctrl-C)" );
    process.exit(1);
});

// initialize the database if it does not already exist
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./messages.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, function (err) {
    if (err) { console.log(err.message); } else {

      var sql =  "CREATE TABLE IF NOT EXISTS capcodes ( ";
	      sql += "id INTEGER PRIMARY KEY AUTOINCREMENT, ";
          sql += "address TEXT NOT NULL, ";
          sql += "alias TEXT NOT NULL, ";
          sql += "agency TEXT, ";
          sql += "icon TEXT, ";
          sql += "color TEXT, ";
          sql += "push INTEGER DEFAULT 0, ";
          sql += "pushpri TEXT, ";
          sql += "pushgroup TEXT, ";
          sql += "pushsound TEXT, ";
          sql += "mailenable INTEGER DEFAULT 0, ";
          sql += "mailto TEXT, ";
          sql += "ignore INTEGER DEFAULT 0 ); ";
          sql += "CREATE TABLE IF NOT EXISTS messages ( ";
          sql += "id INTEGER UNIQUE, ";
          sql += "address TEXT NOT NULL, ";
          sql += "message TEXT NOT NULL, ";
          sql += "source TEXT NOT NULL, ";
          sql += "timestamp INTEGER, ";
          sql += "alias_id INTEGER, ";
          sql += "PRIMARY KEY(`id`), FOREIGN KEY(`alias_id`) REFERENCES capcodes(id) ); ";
          sql += "CREATE INDEX IF NOT EXISTS `msg_index` ON `messages` (`address`,`id` DESC); ";
          sql += "CREATE INDEX IF NOT EXISTS `msg_alias` ON `messages` (`id` DESC, `alias_id`); ";
          sql += "CREATE UNIQUE INDEX IF NOT EXISTS `cc_pk_idx` ON `capcodes` (`id`,`address` DESC); ";

      db.serialize(() => {
          db.exec(sql, function(err) {
              if (err) { console.log(err); }
          });
      });
    }
});

// routes
var index = require('./routes/index');
var admin = require('./routes/admin');
var api = require('./routes/api');

// create config file if it does not exist, and set defaults
var conf_defaults = require('./config/default.json');
var conf_file = './config/config.json';
if( ! fs.existsSync(conf_file) ) {
    fs.writeFileSync( conf_file, JSON.stringify(conf_defaults,null, 2) );
}
// load the config file
var nconf = require('nconf');
    nconf.file({file: conf_file});
    nconf.load();

var port = normalizePort(process.env.PORT || '3000');
var app = express();
    app.set('port', port);
    // view engine setup
    app.set('views', path.join(__dirname, 'views'));
    app.set('view engine', 'ejs');
    app.set('trust proxy', 'loopback, linklocal, uniquelocal');

var server = http.createServer(app);
var io = require('socket.io').listen(server);
    server.listen(port);
    server.on('error', onError);
    server.on('listening', onListening);
io.sockets.on('connection', function (socket) {
    socket.removeAllListeners();
    debug('client connect to normal socket');
    socket.on('echo', function (data) {
        io.sockets.emit('message', data);
        console.log('message', data);
    });
});
//Lets set setMaxListeners to a decent number - not to high to allow the memory leak warking to still trigger
io.sockets.setMaxListeners(20);
//Admin Socket
var adminio = io.of('/adminio');
adminio.on('connection', function (socket) {
    socket.removeAllListeners();
    debug('client connect to admin socket');
    adminio.on('echo', function (data) {
        adminio.emit('message', data);
        console.log('message', data);
    });
});

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

// set socket.io to be shared across all modules
app.use(function(req,res,next){
    req.io = io;
    next();
});

// session secret is controlled by config
var secret = nconf.get('global:sessionSecret');
// compress all responses
app.use(compression());
app.use(logger('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }, // 1 week
    store: new SQLiteStore,
    saveUninitialized: true,
    resave: 'true',
    secret: secret
}));
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.use(function(req, res, next) {
  res.locals.version = version;
  res.locals.loglevel = nconf.get('global:loglevel') || 'info';
  next();
});


app.use('/', index);
app.use('/admin', admin);
app.use('/post', api);
app.use('/api', api);


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

  // render the error page
  res.status(err.status || 500);
  res.render('global/error', { title: 'PagerMon' });
});

module.exports = app;

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
    console.info('Listening on ' + bind);
}
