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
var uri ="https://pagermon-hrng.c9users.io/api/messages";
var apikey = "562SBQ2XR3O05P79YAMIV840";
// Make sure you generate a new key when bringing to production

var http = require('http');
var request = require('request');
require('request').debug = true
var rp = require('request-promise-native');
var moment = require('moment');

var colors = require('colors/safe'); // does not alter string prototype
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
  if (line.indexOf('POCSAG512: Address:') > -1) {
  	address = line.match(/POCSAG512: Address:(.*?)Function/)[1].trim();
  } else {
  	address = '';
  }
  if (line.indexOf('Alpha:') > -1) {
  	message = line.match(/Alpha:(.*?)$/)[1].trim();
  	trimMessage = message.replace(/<EOT>/g,'');
  } else {
  	message = false;
  	trimMessage = '';
  }
  // filter out most false hits
  // if too much junk data, make sure '-p' option isn't enabled in multimon
  if (address.length > 5 && message) {
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
			datetime: datetime
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