var express = require('express');
var bodyParser = require('body-parser');
var router = express.Router();
var basicAuth = require('express-basic-auth');
//var emitMessage = require('../includes/emitMessage.js');
var bcrypt = require('bcryptjs');
var JsSearch = require('js-search');
var passport = require('passport');
require('../config/passport')(passport); // pass passport for configuration

var nconf = require('nconf');
// don't forget to change this
var conf_file = './config/config.json';
nconf.file({file: conf_file});
nconf.load();

router.use( bodyParser.json() );       // to support JSON-encoded bodies
router.use(bodyParser.urlencoded({     // to support URL-encoded bodies
  extended: true
}));

router.use(function (req, res, next) {
  res.locals.login = req.isAuthenticated();
  next();
});

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('./messages.db');
    db.configure("busyTimeout", 30000);

  /////////////////////
  //
  // DB Schema
  //
  // Table: messages
  /*
   CREATE TABLE messages ( 
   id integer PRIMARY KEY, 
   address integer NOT NULL, 
   message text NOT NULL, 
   timestamp INTEGER);
  */ 
  // Table: capcodes
  /*
   CREATE TABLE capcodes (
   address integer NOT NULL,
   alias text NOT NULL, 
   agency TEXT, 
   icon TEXT, 
   color TEXT, 
   ignore INTEGER DEFAULT 0, 
   PRIMARY KEY (address)
   );
  */
  /////////////////////

// defaults
var initData = {};
    initData.limit = nconf.get('messages:defaultLimit');
    initData.replaceText = nconf.get('messages:replaceText');
    initData.currentPage = 0;
    initData.pageCount = 0;
    initData.msgCount = 0;
    initData.offset = 0;
    
///////////////////
//               //
// GET messages  //
//               // 
///////////////////    
  
router.get('/messages/init', function(req, res, next) {
    //set current page if specifed as get variable (eg: /?page=2)
    if (typeof req.query.page !== 'undefined') {
        var page = parseInt(req.query.page, 10);
        if (page > 0)
            initData.currentPage = page - 1;
    }
    if (req.query.limit && req.query.limit <= 100) {
        initData.limit = parseInt(req.query.limit, 10);
    }
    db.serialize(() => {
        db.get("SELECT id FROM messages ORDER BY id DESC LIMIT 1", [], function(err, row) {
            if (err) {
                console.log(err);
                db.close((e) => {
                    if (e) console.log(e);
                });                 
            } else {
                initData.msgCount = parseInt(row['id'], 10);
                //console.log(initData.msgCount);
                initData.pageCount = Math.ceil(initData.msgCount/initData.limit);
                var offset = initData.limit * initData.currentPage;
                initData.offset = initData.msgCount - offset;
                if (initData.offset < 0) {
                    initData.offset = 0;
                }
                res.json(initData);
            }
        });
    });
});

/* GET message listing. */
router.get('/messages', function(req, res, next) {
    nconf.load();
    var pdwMode = nconf.get('messages:pdwMode');
    var maxLimit = nconf.get('messages:maxLimit');
    var defaultLimit = nconf.get('messages:defaultLimit');
    initData.replaceText = nconf.get('messages:replaceText');
    
    if (typeof req.query.page !== 'undefined') {
        var page = parseInt(req.query.page, 10);
        if (page > 0) {
            initData.currentPage = page - 1;
        } else {
            initData.currentPage = 0;
        }
    }
    if (req.query.limit && req.query.limit <= maxLimit) {
        initData.limit = parseInt(req.query.limit, 10);
    } else {
        initData.limit = parseInt(defaultLimit, 10);
    }

    var sql = "SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, MAX(capcodes.address) ";
        sql += " FROM messages";
        sql += " LEFT JOIN capcodes ON messages.address LIKE (capcodes.address || '%')";
        sql += " GROUP BY messages.id ORDER BY messages.id DESC";
    db.all(sql,function(err,rows){
        if (err) {
            console.log(err);
            db.close((e) => {
                if (e) console.log(e);
            });                 
        } else if (rows) {
            var result;
            if (pdwMode)
                result = rows.filter(function(x){return x.ignore==0});
            else
                result = rows.filter(function(x){return !x.ignore || x.ignore==0});
            initData.msgCount = result.length;
            initData.pageCount = Math.ceil(initData.msgCount/initData.limit);
            if (initData.currentPage > initData.pageCount) {
                initData.currentPage = 0;
            }
            initData.offset = initData.limit * initData.currentPage;
            if (initData.offset < 0) {
                initData.offset = 0;
            }
            initData.offsetEnd = initData.offset + initData.limit;
            var limitResults = result.slice(initData.offset, initData.offsetEnd);
            res.status(200).json({'init': initData, 'messages': limitResults});
        } else {
            res.status(200).json({'init': {}, 'messages': []});
        }
    });
});

/*    db.serialize(() => {
        db.get("SELECT id FROM messages ORDER BY id DESC LIMIT 1", [], function(err, row) {
            if (err) {
                console.log(err);
                db.close((e) => {
                    if (e) console.log(e);
                });
            } else {
                initData.msgCount = parseInt(row['id'], 10);
                //console.log(initData.msgCount);
                initData.pageCount = Math.ceil(initData.msgCount/initData.limit);
                var offset = initData.limit * initData.currentPage;
                initData.offset = initData.msgCount - offset;
                if (initData.offset < 0) {
                    initData.offset = 0;
                }
                
                var sql = "SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, MAX(capcodes.address) ";
                    sql += " FROM messages";
                    sql += " LEFT JOIN capcodes ON messages.address LIKE (capcodes.address || '%')";
                    sql += " WHERE messages.id <= "+initData.offset;
                    sql += " GROUP BY messages.id ORDER BY messages.id DESC";
                    sql += " LIMIT "+initData.limit;
                // var sql = "SELECT * from messages ORDER BY timestamp";
                db.all(sql,function(err,rows){
                    if (err) return next(err);
                    res.json(rows);
                });
            }
        });
    }); */


router.get('/messages/:id', function(req, res, next) {
    nconf.load();
    var pdwMode = nconf.get('messages:pdwMode');
    var id = req.params.id;
    var sql = "SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, MAX(capcodes.address) ";
    sql += " FROM messages";
    sql += " LEFT JOIN capcodes ON messages.address LIKE (capcodes.address || '%')";
    sql += " WHERE messages.id = "+id;
    db.serialize(() => {
        db.get(sql,function(err,row){
            if (err) {
                res.status(500).send(err);
            } else {
                if(row.ignore == 1) {
                    res.status(200).json({});
                } else {
                    if(pdwMode && !row.alias) {
                        res.status(200).json({});
                    } else {
                        res.status(200).json(row);
                    }
                }
            }
        });
    });
});

router.get('/messages/address/:id', function(req, res, next) {
    var id = req.params.id;
    db.serialize(() => {
        db.all("SELECT * from messages WHERE address=?", id, function(err,rows){
            if (err) {
                res.status(500);
                res.send(err);
            } else {
                res.status(200);
                res.json(rows);
            }
        });
    });
});

/* GET message search */
router.get('/messageSearch', function(req, res, next) {
    nconf.load();
    var pdwMode = nconf.get('messages:pdwMode');
    var maxLimit = nconf.get('messages:maxLimit');
    var defaultLimit = nconf.get('messages:defaultLimit');
    initData.replaceText = nconf.get('messages:replaceText');
    
    if (typeof req.query.page !== 'undefined') {
        var page = parseInt(req.query.page, 10);
        if (page > 0) {
            initData.currentPage = page - 1;
        } else {
            initData.currentPage = 0;
        }
    }
    if (req.query.limit && req.query.limit <= maxLimit) {
        initData.limit = parseInt(req.query.limit, 10);
    } else {
        initData.limit = parseInt(defaultLimit, 10);
    }
    
    var query;
    var agency;
    var address;
    // dodgy handling for unexpected results
    if (typeof req.query.q !== 'undefined') { query = req.query.q;
    } else { query = ''; }
    if (typeof req.query.agency !== 'undefined') { agency = req.query.agency;
    } else { agency = ''; }
    if (typeof req.query.address !== 'undefined') { address = req.query.address;
    } else { address = ''; }
    
    var sql = "SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, MAX(capcodes.address) ";
        sql += " FROM messages";
        sql += " LEFT JOIN capcodes ON messages.address LIKE (capcodes.address || '%')";
        sql += " GROUP BY messages.id ORDER BY messages.id DESC";
    db.all(sql,function(err,rows){
        if (err) return next(err);
        // get the search results - js-search
        var search = new JsSearch.Search('id');
            search.searchIndex = new JsSearch.UnorderedSearchIndex();
            search.tokenizer = new JsSearch.StopWordsTokenizer(
    	        new JsSearch.SimpleTokenizer());
    	if (agency || address) {
            search.addIndex('address');
            search.addIndex('alias');
            search.addIndex('agency');
            search.addIndex('source');
    	} else {
            search.addIndex('message');
            search.addIndex('address');
            search.addIndex('alias');
            search.addIndex('agency');
            search.addIndex('source');
    	}
	        search.addDocuments(rows);
	    var sResult;
	    if (query) {
	        sResult = search.search(query);
	    } else {
	        if (agency) {
	            sResult = search.search(agency);
	        } else if (address) {
	            sResult = search.search(address);
	        } else {
	            sResult = search.search();
	        }
	    }
        var result;
        if (pdwMode)
	        result = sResult.filter(function(x){return x.ignore==0});
	    else
	        result = sResult.filter(function(x){return !x.ignore || x.ignore==0});
	    
        // sort by value
        result.sort(function (a, b) {
          return b.id - a.id;
        });
	    
        if (result.length > 250) {
            initData.msgCount = 250;
        } else {
            initData.msgCount = result.length;    
        }
        initData.pageCount = Math.ceil(initData.msgCount/initData.limit);
        if (initData.currentPage > initData.pageCount) {
            initData.currentPage = 0;
        }
        initData.offset = initData.limit * initData.currentPage;
        if (initData.offset < 0) {
            initData.offset = 0;
        }
        initData.offsetEnd = initData.offset + initData.limit;
        var limitResults = result.slice(initData.offset, initData.offsetEnd);
	    
        res.json({'init': initData, 'messages': limitResults});
    });
});

///////////////////
//               //
// GET capcodes  //
//               // 
/////////////////// 


// capcodes aren't pagified at the moment
router.get('/capcodes/init', function(req, res, next) {
    //set current page if specifed as get variable (eg: /?page=2)
    if (typeof req.query.page !== 'undefined') {
        var page = parseInt(req.query.page, 10);
        if (page > 0)
            initData.currentPage = page - 1;
    }
    db.serialize(() => {
        db.get("SELECT address FROM capcodes ORDER BY address DESC LIMIT 1", [], function(err, row) {
            if (err) {
                console.log(err);
            } else {
                initData.msgCount = parseInt(row['id'], 10);
                //console.log(initData.msgCount);
                initData.pageCount = Math.ceil(initData.msgCount/initData.limit);
                var offset = initData.limit * initData.currentPage;
                initData.offset = initData.msgCount - offset;
                if (initData.offset < 0) {
                    initData.offset = 0;
                }
                res.json(initData);
            }
        });    
    });
});

router.get('/capcodes', function(req, res, next) {
    db.serialize(() => {
        db.all("SELECT * from capcodes ORDER BY address",function(err,rows){
            if (err) return next(err);
            res.json(rows);
        });
    });
});

router.get('/capcodes/:id', function(req, res, next) {
    var id = req.params.id;
    db.serialize(() => {
        db.get("SELECT * from capcodes WHERE address=?", id, function(err, row){
            if (err) {
                res.status(500);
                res.send(err);
            } else {
                if (row) {
                    res.status(200);
                    res.json(row);                    
                } else {
                    row = {
                        "address": "",
                        "alias": "",
                        "agency": "",
                        "icon": "question",
                        "color": "black"
                    };
                    res.status(200);
                    res.json(row);
                }
            }
        });
    });
  
});

router.get('/capcodes/agency/:id', function(req, res, next) {
    var id = req.params.id;
    db.serialize(() => {
        db.all("SELECT * from capcodes WHERE agency LIKE ?", id, function(err,rows){
            if (err) {
                res.status(500);
                res.send(err);
            } else {
                res.status(200);
                res.json(rows);
            }
        });
    });
});

//////////////////////////////////
//
// POST calls below
// 
// require API key or auth session
//
//////////////////////////////////

/*
router.all('/authenticate',
  passport.authenticate('localapikey', { session: false, failWithError: true }),
  function(req, res, next) {
      next();
  },
  function(err, req, res, next) {
      isLoggedIn(req, res, next);
  });
  
router.all('/authenticate', function(req,res, next) {
    return res.status(200).json({ message: "Authenticated as "+req.user });
});

router.use(basicAuth({
    users: { 'admin': 'supersecret' },
    challenge: true,
    unauthorizedResponse: getUnauthorizedResponse
}));
 
function getUnauthorizedResponse(req) {
    return req.auth ?
        ('Credentials ' + req.auth.user + ':' + req.auth.password + ' rejected') :
        'No credentials provided';
} */

router.all('*',
  passport.authenticate('localapikey', { session: false, failWithError: true }),
  function(req, res, next) {
      next();
  },
  function(err, req, res, next) {
      console.log(err);
      isLoggedIn(req, res, next);
  });

router.post('/messages', function(req, res, next) {
//    db = new sqlite3.Database('./messages.db');
//    db.configure("busyTimeout", 30000);
    nconf.load();
    if (req.body.address && req.body.message) {
        var filterDupes = nconf.get('messages:duplicateFiltering');
        var dupeLimit = nconf.get('messages:duplicateLimit');
        db.serialize(() => {
            //db.run("UPDATE tbl SET name = ? WHERE id = ?", [ "bar", 2 ]);
            var address = req.body.address || 0;
            var message = req.body.message || 'null';
            var datetime = req.body.datetime || 1;
            var source = req.body.source || 'UNK';
            var dupeCheck = "SELECT * FROM messages WHERE id IN ( SELECT id FROM messages ORDER BY id DESC LIMIT "+dupeLimit;
                dupeCheck += " ) AND message LIKE '"+message+"' AND address="+address;
            db.get(dupeCheck, [], function (err, row) {
                if (err) {
                    res.status(500);
                    res.send(err, this);                
                } else {
                    if (row && filterDupes) {
                        console.log('Ignoring duplicate: ', message);
                        res.status(200);
                        res.send('Ignoring duplicate');
                    } else {
                        db.run("INSERT INTO messages (address, message, timestamp, source) VALUES ($mesAddress, $mesBody, $mesDT, $mesSource);", {
                          $mesAddress: address,
                          $mesBody: message,
                          $mesDT: datetime,
                          $mesSource: source
                        }, function(err){
                            if (err) {
                                res.status(500);
                                //console.log(this);
                                res.send(err, this);
                            } else {
                                res.status(200);
                                //console.log(this);
                                req.io.emit('messagePost', ''+this.lastID);
                                res.send(''+this.lastID);
                            }
                        });
                    }
                }
                
            });
        });
    } else {
        res.status(500).json({message: 'Error - address or message missing'});
    }
});

router.post('/capcodes', function(req, res, next) {
//    db = new sqlite3.Database('./messages.db');
//    db.configure("busyTimeout", 30000);
    nconf.load();
    if (req.body.address && req.body.alias) {
        var address = req.body.address || 0;
        var alias = req.body.alias || 'null';
        var agency = req.body.agency || 'null';
        var color = req.body.color || 'black';
        var icon = req.body.icon || 'question';
        var ignore = req.body.ignore || 0;
        db.serialize(() => {
            //db.run("UPDATE tbl SET name = ? WHERE id = ?", [ "bar", 2 ]);
            db.run("REPLACE INTO capcodes (address, alias, agency, color, icon, ignore) VALUES ($mesAddress, $mesAlias, $mesAgency, $mesColor, $mesIcon, $mesIgnore);", {
              $mesAddress: address,
              $mesAlias: alias,
              $mesAgency: agency,
              $mesColor: color,
              $mesIcon: icon,
              $mesIgnore: ignore
            }, function(err){
                if (err) {
                    res.status(500);
                    res.send(err, this);
                } else {
                    res.status(200);
                    res.send(''+this.lastID);
                }
            });
            console.log(req.body || 'no request body');
        });
    } else {
        res.status(500).json({message: 'Error - address or alias missing'});
    }
});

router.post('/capcodes/:id', function(req, res, next) {
    var id = req.params.id;
    if (id == 'deleteMultiple') {
        // do delete multiple
        var idList = req.body.deleteList || [0, 0];
        if (!idList.some(isNaN)) {
            console.log('Deleting: '+idList);
            db.serialize(() => {
                db.run(inParam('DELETE FROM capcodes WHERE address IN (?#)', idList), idList, function(err){
                    if (err) {
                        res.status(500).send(err, this);
                    } else {
                        res.status(200).send({'status': 'ok'});
                    }
                });
            });
        } else {
            res.status(500).send({'status': 'id list contained non-numbers'});
        }
    } else {
      if (req.body.address && req.body.alias) {
        nconf.load();
        var address = req.body.address || 0;
        var alias = req.body.alias || 'null';
        var agency = req.body.agency || 'null';
        var color = req.body.color || 'black';
        var icon = req.body.icon || 'question';
        var ignore = req.body.ignore || 0;
        db.serialize(() => {
            //db.run("UPDATE tbl SET name = ? WHERE id = ?", [ "bar", 2 ]);
            db.run("REPLACE INTO capcodes (address, alias, agency, color, icon, ignore) VALUES ($mesAddress, $mesAlias, $mesAgency, $mesColor, $mesIcon, $mesIgnore);", {
              $mesAddress: address,
              $mesAlias: alias,
              $mesAgency: agency,
              $mesColor: color,
              $mesIcon: icon,
              $mesIgnore: ignore
            }, function(err){
                if (err) {
                    res.status(500).send(err, this);
                } else {
                    res.status(200).send({'status': 'ok'});
                }
            });
            console.log(req.body || 'request body empty');
        });
      } else {
          res.status(500).json({message: 'Error - address or alias missing'});
      }
    }
});

router.delete('/capcodes/:id', function(req, res, next) {
    // delete single alias
    var id = parseInt(req.params.id, 10);
    nconf.load();
    console.log('Deleting '+id);
    db.serialize(() => {
        //db.run("UPDATE tbl SET name = ? WHERE id = ?", [ "bar", 2 ]);
        db.run("DELETE FROM capcodes WHERE address=?", id, function(err){
            if (err) {
                res.status(500).send(err, this);
            } else {
                res.status(200).send({'status': 'ok'});
            }
        });
        console.log(req.body || 'request body empty');
    });
});

router.use( [
        handleError
        ] );

module.exports = router;

function inParam (sql, arr) {
  return sql.replace('?#', arr.map(()=> '?' ).join(','));
}

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
    // if user is authenticated in the session, carry on 
    if (req.isAuthenticated())
        return next();
    // if they aren't redirect them to the home page, or send an error if they're an API
    if (req.xhr) {
        res.status(401).json({error: 'Authentication failed.'});
    } else {
        //res.redirect('/login');
        res.status(401).json({error: 'Authentication failed.'});
    }
}

function handleError(err,req,res,next){
    var output = {
        error: {
            name: err.name,
            message: err.message,
            text: err.toString()
        }
    };
    var statusCode = err.status || 500;
    res.status(statusCode).json(output);
}