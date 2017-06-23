//
// PagerMon - reader.js
// 2017-06-04
// Author: Dave McKenzie
//
// Description: Takes output of multimon-ng and pushes to PagerMon server
//
// Usage: Invoke via a shell script, ideally
// 		If not, just pipe multimon's output to it
//
// Example: reader.sh
//

// CONFIG
// create config file if it does not exist, and set defaults
var fs = require('fs');
var conf_defaults = require('./config/default.json');
var conf_file = './config/config.json';
if( ! fs.existsSync(conf_file) ) {
    fs.writeFileSync( conf_file, JSON.stringify(conf_defaults,null, 2) );
    console.log('created config file - set your api key in '+conf_file);
    return;
}
// load the config file
var nconf = require('nconf');
    nconf.file({file: conf_file});
    nconf.load();

var hostname = nconf.get('hostname');
var apikey = nconf.get('apikey');
var identifier = nconf.get('identifier');

var uri = hostname+"/api/messages";

var http = require('http');
var request = require('request');
require('request').debug = true
var rp = require('request-promise-native');
var moment = require('moment');

var colors = require('colors/safe');
colors.setTheme({
  success: ['white', 'bold', 'bgBlue'],
  error: ['red', 'bold', 'bgwhite']
});

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    terminal: true
});

rl.on('line', (line) => {
  //console.log(`Received: ${line.trim()}`);
  var time = moment().format("YYYY-MM-DD HH:mm:ss");
  var datetime = moment().unix();
  var address;
  var message;
  var trimMessage;
  // TODO: pad address with zeros for better address matching
//  if (line.indexOf('POCSAG512: Address:') > -1) {	
  if (/^POCSAG(\d+): Address: /.test(line) ) {
  	address = line.match(/POCSAG(\d+): Address:(.*?)Function/)[2].trim();
    if (line.indexOf('Alpha:') > -1) {
    	message = line.match(/Alpha:(.*?)$/)[1].trim();
    	trimMessage = message.replace(/<EOT>/g,'');
    } else {
    	message = false;
    	trimMessage = '';
    }
  } else if (line.indexOf('FLEX: ') > -1) {
    address = line.match(/FLEX:.*\[(.*?)\] /)[1].trim();
    if (line.match( /( ALN | GPN | NUM)/ )) {
      message = line.match(/FLEX:.*\[.*\] ... (.*?)$/)[1].trim();
      trimMessage = message;
    } else {
      message = false;
      trimMessage = '';
    }
  } else {
  	address = '';
  	message = false;
  	trimMessage = '';
  }

  // filter out most false hits
  // if too much junk data, make sure '-p' option isn't enabled in multimon
  if (address.length > 4 && message) {
  	console.log(colors.red(time+': ')+colors.yellow(address+': ')+colors.success(trimMessage));
  	// now send the message
	var options = {
		method: 'POST',
		uri: uri,
		headers: {
			'X-Requested-With': 'XMLHttpRequest',
			apikey: apikey
		},
		form: {
			address: address,
			message: trimMessage,
			datetime: datetime,
			source: identifier
		}
	};
	rp(options)
	    .then(function (body) {
	    //    console.log(colors.success('Message delivered. ID: '+body)); 
	    })
	    .catch(function (err) {
	        console.log(colors.yellow('Message failed to deliver. '+err));
	    });
  } else {
  	console.log(colors.red(time+': ')+colors.grey(line));
  }
  
}).on('close', () => {
  console.log('Input died!');
});
