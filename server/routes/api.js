var express = require('express');
var bodyParser = require('body-parser');
var router = express.Router();
var basicAuth = require('express-basic-auth');
var bcrypt = require('bcryptjs');
var JsSearch = require('js-search');
var passport = require('passport');
var push = require('pushover-notifications');
const nodemailer = require('nodemailer');
require('../config/passport')(passport); // pass passport for configuration

var nconf = require('nconf');
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

// defaults
var initData = {};
    initData.limit = nconf.get('messages:defaultLimit');
    initData.replaceText = nconf.get('messages:replaceText');
    initData.currentPage = 0;
    initData.pageCount = 0;
    initData.msgCount = 0;
    initData.offset = 0;

// auth variables
var HideCapcode = nconf.get('messages:HideCapcode');
var apiSecurity = nconf.get('messages:apiSecurity');

if (HideCapcode && apiSecurity) {
	router.get('/capcodes', isLoggedIn, function(req, res, next) {
		db.serialize(() => {
			db.all("SELECT * from capcodes ORDER BY REPLACE(address, '_', '%')",function(err,rows){
				if (err) return next(err);
				res.json(rows);
			});
		});
	});
} else if (!apiSecurity && HideCapcode) {
	router.get('/capcodes', isLoggedIn, function(req, res, next) {
		db.serialize(() => {
			db.all("SELECT * from capcodes ORDER BY REPLACE(address, '_', '%')",function(err,rows){
				if (err) return next(err);
				res.json(rows);
			});
		});
	});
} else if (apiSecurity && !HideCapcode) {
	router.get('/capcodes', isLoggedIn, function(req, res, next) {
		db.serialize(() => {
			db.all("SELECT * from capcodes ORDER BY REPLACE(address, '_', '%')",function(err,rows){
				if (err) return next(err);
				res.json(rows);
			});
		});
	});
} else {
	router.get('/capcodes', function(req, res, next) {
		db.serialize(() => {
			db.all("SELECT * from capcodes ORDER BY REPLACE(address, '_', '%')",function(err,rows){
				if (err) return next(err);
				res.json(rows);
			});
		});
	});
}




	 // secure all API's if API Security is enabled
 if (apiSecurity) {
	 router.all('*',
	   passport.authenticate('localapikey', { session: false, failWithError: true }),
	   function(req, res, next) {
		   next();
	   },
	   function(err, req, res, next) {
		   console.error(err);
		   isLoggedIn(req, res, next);
	   });
 };



///////////////////
//               //
// GET messages  //
//               //
///////////////////

/* GET message listing. */
router.get('/messages', function(req, res, next) {
    nconf.load();
    console.time('init');
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
    var initSql;
    if (pdwMode) {
        initSql =  "SELECT COUNT(*) AS msgcount FROM messages WHERE alias_id IN (SELECT id FROM capcodes WHERE ignore = 0);";
    } else {
        initSql = "SELECT COUNT(*) AS msgcount FROM messages WHERE alias_id IS NULL OR alias_id NOT IN (SELECT id FROM capcodes WHERE ignore = 1);";
    }
    db.get(initSql,function(err,count){
        if (err) {
            console.error(err);
        } else if (count) {
            initData.msgCount = count.msgcount;
            initData.pageCount = Math.ceil(initData.msgCount/initData.limit);
            if (initData.currentPage > initData.pageCount) {
                initData.currentPage = 0;
            }
            initData.offset = initData.limit * initData.currentPage;
            if (initData.offset < 0) {
                initData.offset = 0;
            }
            initData.offsetEnd = initData.offset + initData.limit;
            console.timeEnd('init');
            console.time('sql');
            var sql;
            if(pdwMode) {
                sql =  "SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch ";
                sql += " FROM messages";
                sql += " INNER JOIN capcodes ON capcodes.id = messages.alias_id WHERE capcodes.ignore = 0";
                sql += " ORDER BY messages.id DESC LIMIT "+initData.limit+" OFFSET "+initData.offset+";";
            } else {
                sql =  "SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch ";
                sql += " FROM messages";
                sql += " LEFT JOIN capcodes ON capcodes.id = messages.alias_id WHERE capcodes.ignore = 0 OR capcodes.ignore IS NULL ";
                sql += " ORDER BY messages.id DESC LIMIT "+initData.limit+" OFFSET "+initData.offset+";";
            }
            var result = [];
            db.each(sql,function(err,row){
					  //outRow = JSON.parse(newrow);
					if (HideCapcode) {
						if (!req.isAuthenticated()) {
							row = {
								"id": row.id,
								"message": row.message,
								"source": row.source,
								"timestamp": row.timestamp,
								"alias_id": row.alias_id,
								"alias": row.alias,
								"agency": row.agency,
								"icon": row.icon,
								"color": row.color,
								"ignore": row.ignore,
								"aliasMatch": row.aliasMatch
							};
						} else {
						}
					}
                if (err) {
                    console.error(err);
                } else if (row) {
                    result.push(row);
                } else {
                    console.log('empty results');
                }
            },function(err,rowCount){
                if (err) {
                    console.timeEnd('sql');
                    console.error(err);
                    res.status(500).send(err);
                } else if (rowCount > 0) {
                    console.timeEnd('sql');
                    //var limitResults = result.slice(initData.offset, initData.offsetEnd);
                    console.time('send');
                    res.status(200).json({'init': initData, 'messages': result});
                    console.timeEnd('send');
                } else {
                    res.status(200).json({'init': {}, 'messages': []});
                }
            });
        } else {
            console.log('empty results');
        }
    });
});

router.get('/messages/:id', function(req, res, next) {
    nconf.load();
    var pdwMode = nconf.get('messages:pdwMode');
    var id = req.params.id;
    var sql =  "SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch ";
        sql += " FROM messages";
        sql += " LEFT JOIN capcodes ON capcodes.id = messages.alias_id ";
        sql += " WHERE messages.id = "+id;
    db.serialize(() => {
        db.get(sql,function(err,row){
            if (err) {
                res.status(500).send(err);
            } else {
					if (HideCapcode) {
						if (!req.isAuthenticated()) {
							row = {
								"id": row.id,
								"message": row.message,
								"source": row.source,
								"timestamp": row.timestamp,
								"alias_id": row.alias_id,
								"alias": row.alias,
								"agency": row.agency,
								"icon": row.icon,
								"color": row.color,
								"ignore": row.ignore,
								"aliasMatch": row.aliasMatch
							};
						} else {
						}
					}
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
/*
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
});*/

/* GET message search */
router.get('/messageSearch', function(req, res, next) {
    nconf.load();
    console.time('init');
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
    var sql;

    // set select commands based on query type
    // address can be address or source field
    if(pdwMode) {
        sql =  "SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch ";
        sql += " FROM messages";
        sql += " INNER JOIN capcodes ON capcodes.id = messages.alias_id";
    } else {
        sql =  "SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch ";
        sql += " FROM messages";
        sql += " LEFT JOIN capcodes ON capcodes.id = messages.alias_id ";
    }
    if(address != '' || agency != '')
        sql += ' WHERE';
    if(address != '')
        sql += ' messages.address LIKE "'+address+'" OR messages.source = "'+address+'" OR ';
    if(agency != '')
        sql += ' messages.alias_id IN (SELECT id FROM capcodes WHERE agency = "'+agency+'" AND ignore = 0) OR ';
    if(address != '' || agency != '')
        sql += ' messages.id IS NULL';

        sql += " ORDER BY messages.id DESC;";

    console.timeEnd('init');
    console.time('sql');

    var rows = [];
    db.each(sql,function(err,row){
        if (err) {
            console.error(err);
        } else if (row) {
					if (HideCapcode) {
						if (!req.isAuthenticated()) {
							row = {
								"id": row.id,
								"message": row.message,
								"source": row.source,
								"timestamp": row.timestamp,
								"alias_id": row.alias_id,
								"alias": row.alias,
								"agency": row.agency,
								"icon": row.icon,
								"color": row.color,
								"ignore": row.ignore,
								"aliasMatch": row.aliasMatch
							};
						} else {
						}
					}
            if (pdwMode) {
                if (row.ignore == 0)
                    rows.push(row);
            } else {
                if (!row.ignore || row.ignore == 0)
                    rows.push(row);
            }
        } else {
            console.log('empty results');
        }
    },function(err,rowCount){
        if (err) {
            console.timeEnd('sql');
            console.error(err);
            res.status(500).send(err);
        } else if (rowCount > 0) {
            console.timeEnd('sql');
            console.time('search');
            var result;
            if (query != '') {
                var search = new JsSearch.Search('id');
                    search.searchIndex = new JsSearch.UnorderedSearchIndex();
                    search.tokenizer = new JsSearch.StopWordsTokenizer(
            	        new JsSearch.SimpleTokenizer());
                    search.addIndex('message');
                    search.addIndex('address');
                    search.addIndex('alias');
                    search.addIndex('agency');
        	    console.timeEnd('search');
        	    console.time('searchFullText');
        	        search.addDocuments(rows);
                result = search.search(query);
                console.timeEnd('searchFullText');
                console.time('sort');
        	    result.sort(function (a, b) {
                    return b.id - a.id;
                });
                console.timeEnd('sort');
            } else {
                result = rows;
                console.timeEnd('search');
            }
            console.time('initEnd');
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

    	    console.timeEnd('initEnd');
            res.json({'init': initData, 'messages': limitResults});
        } else {
            console.timeEnd('sql');
            res.status(200).json({'init': {}, 'messages': []});
        }

    });
});

///////////////////
//               //
// GET capcodes  //
//               //
///////////////////


// capcodes aren't pagified at the moment, this should probably be removed
router.get('/capcodes/init', function(req, res, next) {
    //set current page if specifed as get variable (eg: /?page=2)
    if (typeof req.query.page !== 'undefined') {
        var page = parseInt(req.query.page, 10);
        if (page > 0)
            initData.currentPage = page - 1;
    }
    db.serialize(() => {
        db.get("SELECT id FROM capcodes ORDER BY id DESC LIMIT 1", [], function(err, row) {
            if (err) {
                console.error(err);
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

router.get('/capcodes/:id', function(req, res, next) {
    var id = req.params.id;
    db.serialize(() => {
        db.get("SELECT * from capcodes WHERE id=?", id, function(err, row){
            if (err) {
                res.status(500);
                res.send(err);
            } else {
                if (row) {
					if (HideCapcode) {
						if (!req.isAuthenticated()) {
							row = {
								"id": row.id,
								"message": row.message,
								"source": row.source,
								"timestamp": row.timestamp,
								"alias_id": row.alias_id,
								"alias": row.alias,
								"agency": row.agency,
								"icon": row.icon,
								"color": row.color,
								"ignore": row.ignore,
								"aliasMatch": row.aliasMatch
							};
						}
					}
                    res.status(200);
                    res.json(row);
                } else {
					 row = {
                        "id": "",
                        "address": "",
                        "alias": "",
                        "agency": "",
                        "icon": "question",
                        "color": "black",
                        "push": "",
                        "pushgroup": "",
                        "pushsound": "",
                        "pushpri": "0",
                        "mailenable" : "",
                        "mailto" : ""

                    };
                    res.status(200);
                    res.json(row);
                }
            }
        });
    });

});

router.get('/capcodeCheck/:id', function(req, res, next) {
    var id = req.params.id;
    db.serialize(() => {
        db.get("SELECT * from capcodes WHERE address=?", id, function(err, row){
            if (err) {
                res.status(500);
                res.send(err);
            } else {
                if (row) {
					if (HideCapcode) {
						if (!req.isAuthenticated()) {
							row = {
								"id": row.id,
								"message": row.message,
								"source": row.source,
								"timestamp": row.timestamp,
								"alias_id": row.alias_id,
								"alias": row.alias,
								"agency": row.agency,
								"icon": row.icon,
								"color": row.color,
								"ignore": row.ignore,
								"aliasMatch": row.aliasMatch
							};
						} else {
						}
					}
                    res.status(200);
                    res.json(row);
                } else {
                    row = {
                        "id": "",
                        "address": "",
                        "alias": "",
                        "agency": "",
                        "icon": "question",
                        "color": "black",
                        "push": "",
                        "pushgroup": "",
                        "pushsound": "",
                        "pushpri": "0",
                        "mailenable" : "",
                        "mailto" : ""
                    };
                    res.status(200);
                    res.json(row);
                }
            }
        });
    });

});

router.get('/capcodes/agency/:id', isLoggedIn, function(req, res, next) {
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
//if no api sec, lock down POST
 if (!apiSecurity) {
	router.all('*',
	  passport.authenticate('localapikey', { session: false, failWithError: true }),
	  function(req, res, next) {
		  next();
	  },
	  function(err, req, res, next) {
		  console.info(err);
		  isLoggedIn(req, res, next);
	  });
 }

//////////////////////////////////
//
// POST calls below
//
//////////////////////////////////
router.post('/messages', function(req, res, next) {
    nconf.load();
    if (req.body.address && req.body.message) {
        var filterDupes = nconf.get('messages:duplicateFiltering');
        var dupeLimit = nconf.get('messages:duplicateLimit');
        var pdwMode = nconf.get('messages:pdwMode');
        var pushenable = nconf.get('pushover:pushenable');
        var pushkey = nconf.get('pushover:pushAPIKEY');
        var mailEnable = nconf.get('STMP:MailEnable');
        var MailFrom      = nconf.get('STMP:MailFrom');
        var MailFromName  = nconf.get('STMP:MailFromName');
        var SMTPServer    = nconf.get('STMP:SMTPServer');
        var SMTPPort      = nconf.get('STMP:SMTPPort');
        var STMPUsername  = nconf.get('STMP:STMPUsername');
        var STMPPassword  = nconf.get('STMP:STMPPassword');
        var STMPSecure    = nconf.get('STMP:STMPSecure');

        db.serialize(() => {
            //db.run("UPDATE tbl SET name = ? WHERE id = ?", [ "bar", 2 ]);
            var address = req.body.address || '0000000';
            var message = req.body.message.replace(/["]+/g, '') || 'null';
            var datetime = req.body.datetime || 1;
            var source = req.body.source || 'UNK';
            var dupeCheck = 'SELECT * FROM messages WHERE id IN ( SELECT id FROM messages ORDER BY id DESC LIMIT '+dupeLimit;
                dupeCheck +=' ) AND message LIKE "'+message+'" AND address="'+address+'";';
            db.get(dupeCheck, [], function (err, row) {
                if (err) {
                    res.status(500).send(err);
                } else {
                    if (row && filterDupes) {
                        console.log('Ignoring duplicate: ', message);
                        res.status(200);
                        res.send('Ignoring duplicate');
                    } else {
                        db.get("SELECT id, ignore, push, pushpri, pushgroup, pushsound, mailenable, mailto FROM capcodes WHERE ? LIKE address ORDER BY REPLACE(address, '_', '%') DESC LIMIT 1", address, function(err,row) {
                            var insert;
                            var alias_id = null;
                            var pushonoff = null;
                            var pushpri = null;
                            var pushgroup = null;
                            var pushsound = null;
                            var mailonoff = null;
                            var mailTo = "";
                            if (err) { console.error(err) }
                            if (row) {
                                if (row.ignore == '1') {
                                    insert = false;
                                    console.log('Ignoring filtered address: '+address+' alias: '+row.id);
                                } else {
                                    insert = true;
                                    alias_id = row.id;
                                    pushonoff = row.push;
                                    pushPri = row.pushpri;
                                    pushGroup = row.pushgroup;
                                    pushSound = row.pushsound;
                                    mailonoff = row.mailenable;
                                    mailTo = row.mailto;
                                }
                            } else {
                                insert = true;
                            }
                            if (insert == true) {
                                db.run("INSERT INTO messages (address, message, timestamp, source, alias_id) VALUES ($mesAddress, $mesBody, $mesDT, $mesSource, $aliasId);", {
                                  $mesAddress: address,
                                  $mesBody: message,
                                  $mesDT: datetime,
                                  $mesSource: source,
                                  $aliasId: alias_id
                                }, function(err){
                                    if (err) {
                                        res.status(500).send(err);
                                    } else {
                                        // emit the full message
                                        var sql =  "SELECT messages.*, capcodes.alias, capcodes.agency, capcodes.icon, capcodes.color, capcodes.ignore, capcodes.id AS aliasMatch FROM messages";
                                        if(pdwMode) {
                                            sql += " INNER JOIN capcodes ON capcodes.id = messages.alias_id ";
                                        } else {
                                            sql += " LEFT JOIN capcodes ON capcodes.id = messages.alias_id ";
                                        }
                                            sql += " WHERE messages.id = "+this.lastID;
                                        var reqLastID = this.lastID;
                                        db.get(sql,function(err,row){
                                            if (err) {
                                                res.status(500).send(err);
                                            } else {
                                                if(row) {
													//console.log(row);
													//req.io.emit('messagePost', row);
													if (HideCapcode) {
														//Emit full details to the admin socket
														req.io.of('adminio').emit('messagePost', row);
														// Emit No capdoe to normal socket
														row = {
															"id": row.id,
															"message": row.message,
															"source": row.source,
															"timestamp": row.timestamp,
															"alias_id": row.alias_id,
															"alias": row.alias,
															"agency": row.agency,
															"icon": row.icon,
															"color": row.color,
															"ignore": row.ignore,
															"aliasMatch": row.aliasMatch
															 };
															req.io.emit('messagePost', row);

													}else {
														//Just emit - No Security enabled
														req.io.emit('messagePost', row);

													}
												}
                                                res.status(200).send(''+reqLastID);
                                                //Check to see if Email is enabled globaly
                                                if (mailEnable == true){
                                                  // Check to see if the capcode is set to mailto
                                                  if (mailonoff == 1) {
                                                    let smtpConfig = {
                                                        host: SMTPServer,
                                                        port: SMTPPort,
                                                        secure: STMPSecure, // upgrade later with STARTTLS
                                                        auth: {
                                                            user: STMPUsername,
                                                            pass: STMPPassword
                                                        },
                                                        tls: {
                                                              // do not fail on invalid certs
                                                              rejectUnauthorized: false
                                                          }
                                                    };
                                                    let transporter = nodemailer.createTransport(smtpConfig,[])

                                                        let mailOptions = {
                                                            from: '"'+MailFromName+'" <'+MailFrom+'>', // sender address
                                                            to: mailTo, // list of receivers
                                                            subject: row.agency+' - '+row.alias, // Subject line
                                                            text: row.message, // plain text body
                                                            html: '<b>'+row.message+'</b>' // html body
                                                        };

                                                        // send mail with defined transport object
                                                        transporter.sendMail(mailOptions, (error, info) => {
                                                            if (error) {
                                                                return console.error(error);
                                                            }
                                                            console.log('Message sent: %s', info.messageId);
                                                        });
                                                  } else {
                                                      //do nothing bruh
                                                  };
                                                };

                                                //check config to see if push is gloably enabled
                                                if (pushenable == true) {
                                                    //check the alais to see if push is enabled for it
                                                    if (pushonoff == 1) {
                                                        var p = new push({
                                                            user: pushGroup,
                                                            token: pushkey,
                                                        });

                                                        if (pushPri == 2) {
                                                          //emergency message
                                                          var msg = {
                                                              message: row.message,
                                                              title: row.agency+' - '+row.alias,
                                                              sound: pushSound,
                                                              priority: 2,
                                                              retry: 60,
                                                              expire: 240
                                                          };
                                                        } else {
                                                          //Non Emeg message
                                                          var msg = {
                                                              message: row.message,
                                                              title: row.agency+' - '+row.alias,
                                                              sound: pushSound,
                                                              priority: pushPri
                                                          };
                                                        }

                                                        if (pushPri == 2) {
                                                            p.send(msg, function (err, result) {
                                                                if (err) {
                                                                    //throw err;
                                                                    console.error(err);
                                                                }
                                                                console.log("SENDING EMERGENCY PUSH NOTIFICATION")
                                                                console.log(result);
                                                            });

                                                        } else {
                                                            p.send(msg, function (err, result) {
                                                                if (err) {
                                                                    //throw err;
                                                                    console.error(err);
                                                                }

                                                                console.log(result);
                                                            });
                                                        }


                                                    } else {
                                                        //do nothing bruh
                                                    };

                                                };
                                            }
                                        });
                                    }
                                });
                            } else {
                                res.status(200);
                                res.send('Ignoring filtered');
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
    nconf.load();
    var updateRequired = nconf.get('database:aliasRefreshRequired');
    if (req.body.address && req.body.alias) {
        var id = req.body.id || null;
        var address = req.body.address || 0;
        var alias = req.body.alias || 'null';
        var agency = req.body.agency || 'null';
        var color = req.body.color || 'black';
        var icon = req.body.icon || 'question';
        var ignore = req.body.ignore || 0;
        var push = req.body.push || 0;
        var pushpri = req.body.pushpri || "0";
        var pushgroup = req.body.pushgroup || 0;
        var pushsound = req.body.pushsound || '';
        var Mailenable = req.body.mailenable || 0;
        var MailTo = req.body.mailto || '';
        db.serialize(() => {
            db.run("REPLACE INTO capcodes (id, address, alias, agency, color, icon, ignore, push, pushpri, pushgroup, pushsound, mailenable, mailto) VALUES ($mesID, $mesAddress, $mesAlias, $mesAgency, $mesColor, $mesIcon, $mesIgnore, $mesPush, $mesPushPri, $mesPushGroup, $mesPushSound, $MailEnable, $MailTo );", {
              $mesID: id,
              $mesAddress: address,
              $mesAlias: alias,
              $mesAgency: agency,
              $mesColor: color,
              $mesIcon: icon,
              $mesIgnore: ignore,
              $mesPush : push,
              $mesPushPri: pushpri,
              $mesPushGroup: pushgroup,
              $mesPushSound: pushsound,
              $MailEnable : Mailenable,
              $MailTo : MailTo
            }, function(err){
                if (err) {
                    res.status(500).send(err);
                } else {
                    res.status(200);
                    res.send(''+this.lastID);
                    if (!updateRequired || updateRequired == 0) {
                        nconf.set('database:aliasRefreshRequired', 1);
                        nconf.save();
                    }
                }
            });
            console.log(req.body || 'no request body');
        });
    } else {
        res.status(500).json({message: 'Error - address or alias missing'});
    }
});

router.post('/capcodes/:id', function(req, res, next) {
    var id = req.params.id || req.body.id || null;
    nconf.load();
    var updateRequired = nconf.get('database:aliasRefreshRequired');
    if (id == 'deleteMultiple') {
        // do delete multiple
        var idList = req.body.deleteList || [0, 0];
        if (!idList.some(isNaN)) {
            console.log('Deleting: '+idList);
            db.serialize(() => {
                db.run(inParam('DELETE FROM capcodes WHERE id IN (?#)', idList), idList, function(err){
                    if (err) {
                        res.status(500).send(err);
                    } else {
                        res.status(200).send({'status': 'ok'});
                        if (!updateRequired || updateRequired == 0) {
                            nconf.set('database:aliasRefreshRequired', 1);
                            nconf.save();
                        }
                    }
                });
            });
        } else {
            res.status(500).send({'status': 'id list contained non-numbers'});
        }
    } else {
      if (req.body.address && req.body.alias) {
        if (id == 'new')
            id = null;
        var address = req.body.address || 0;
        var alias = req.body.alias || 'null';
        var agency = req.body.agency || 'null';
        var color = req.body.color || 'black';
        var icon = req.body.icon || 'question';
        var ignore = req.body.ignore || 0;
        var push = req.body.push || 0;
        var pushpri = req.body.pushpri || "0";
        var pushgroup = req.body.pushgroup || 0;
        var pushsound = req.body.pushsound || '';
        var Mailenable = req.body.mailenable || 0;
        var MailTo = req.body.mailto || '';
        var updateAlias = req.body.updateAlias || 0;
        console.time('insert');
        db.serialize(() => {
            //db.run("UPDATE tbl SET name = ? WHERE id = ?", [ "bar", 2 ]);
            db.run("REPLACE INTO capcodes (id, address, alias, agency, color, icon, ignore, push, pushpri, pushgroup, pushsound, mailenable, mailto  ) VALUES ($mesID, $mesAddress, $mesAlias, $mesAgency, $mesColor, $mesIcon, $mesIgnore, $mesPush, $mesPushPri, $mesPushGroup, $mesPushSound, $MailEnable, $MailTo );", {
              $mesID: id,
              $mesAddress: address,
              $mesAlias: alias,
              $mesAgency: agency,
              $mesColor: color,
              $mesIcon: icon,
              $mesIgnore: ignore,
              $mesPush : push,
              $mesPushPri: pushpri,
              $mesPushGroup: pushgroup,
              $mesPushSound: pushsound,
              $MailEnable : Mailenable,
              $MailTo : MailTo
            }, function(err){
                if (err) {
                    console.timeEnd('insert');
                    res.status(500).send(err);
                } else {
                    console.timeEnd('insert');
                    if (updateAlias == 1) {
                        console.time('updateMap');
                        db.run("UPDATE messages SET alias_id = (SELECT id FROM capcodes WHERE messages.address LIKE address ORDER BY REPLACE(address, '_', '%') DESC LIMIT 1);", function(err){
                           if (err) { console.error(err); console.timeEnd('updateMap'); }
                           else { console.timeEnd('updateMap'); }
                        });
                    } else {
                        if (!updateRequired || updateRequired == 0) {
                            nconf.set('database:aliasRefreshRequired', 1);
                            nconf.save();
                        }
                    }
                    res.status(200).send({'status': 'ok', 'id': this.lastID});
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
    var updateRequired = nconf.get('database:aliasRefreshRequired');
    console.log('Deleting '+id);
    db.serialize(() => {
        //db.run("UPDATE tbl SET name = ? WHERE id = ?", [ "bar", 2 ]);
        db.run("DELETE FROM capcodes WHERE id=?", id, function(err){
            if (err) {
                res.status(500).send(err);
            } else {
                res.status(200).send({'status': 'ok'});
                if (!updateRequired || updateRequired == 0) {
                    nconf.set('database:aliasRefreshRequired', 1);
                    nconf.save();
                }
            }
        });
        console.log(req.body || 'request body empty');
    });
});

router.post('/capcodeRefresh', function(req, res, next) {
    nconf.load();
    console.time('updateMap');
    db.run("UPDATE messages SET alias_id = (SELECT id FROM capcodes WHERE messages.address LIKE address ORDER BY REPLACE(address, '_', '%') DESC LIMIT 1);", function(err){
       if (err) { console.error(err); console.timeEnd('updateMap'); }
       else {
           console.timeEnd('updateMap');
           nconf.set('database:aliasRefreshRequired', 0);
           nconf.save();
           res.status(200).send({'status': 'ok'});
       }
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
