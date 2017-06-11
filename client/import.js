//
// PagerMon - import.js
// 2017-06-04
// Author: Dave McKenzie
//
// Description: Takes a PDW filters.init file and pushes it to PagerMon server
//
// Usage: cat filters.ini | node import.js
//

// CONFIG
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

var hostname = nconf.get('hostname');
var apikey = nconf.get('apikey');

var uri = hostname+"/api/capcodes";
// Now scroll down and set the agency and color config according to your needs

var http = require('http');
var parse = require('csv-parse');
var request = require('request');
require('request').debug = true
var rp = require('request-promise-native');

var colors = require('colors/safe');
colors.setTheme({
  success: ['green', 'bold'],
  error: 'red'
});

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    terminal: true
});

rl.on('line', (line) => {

  var address;
  var agency;
  var alias;
  var color;
  var icon;

  // ignore non-csv lines
  if (line.indexOf(',') > -1) {
  	parse(line, {comment: '#'}, function(err, output){
  		var ol = output[0];
  		address = ol[1].replace(/\?/g, "");
  		if (ol[2].indexOf(" - ") > -1) {
  			agency = ol[2].match(/(.*?) - /)[1].trim();
  			alias = ol[2].match(/ - (.*?)$/)[1].trim();
  		} else {
  			agency = '';
  			alias = ol[2];
  		}
  		// Agency config:
  		// for icons, see http://fontawesome.io
  		switch (agency) {
  			case 'RFS':
  				icon = "fire";
  				break;
			case 'SES':
				icon = "medkit";
				break;
			default:
				icon = "question";
  		}
  		// Color config:
  		// change this according to your input file
  		switch (ol[7]) {
  			case '3':
  				color = "darkred";
  				break;
  			case '4':
  				color = "darkorange";
  				break;
  			case '7':
  				color = "darkgrey";
  				break;
  			case '8':
  				color = "darkgreen";
  				break;
  			default:
  				color = "green";
  		}
  		if (address != '' && agency != '' && alias != '') {
  			console.log('Sending capcode: '+address, agency, alias, color, icon);
  			var options = {
				method: 'POST',
				uri: uri,
				headers: {
					'X-Requested-With': 'XMLHttpRequest',
					apikey: apikey
				},
	  			form: {
	  				address: address,
	  				agency: agency,
	  				alias: alias,
	  				color: color,
	  				icon: icon
	  			}
			};
			rp(options)
			    .then(function (body) {
			        console.log(colors.success('Success! '+body)); 
			    })
			    .catch(function (err) {
			        console.log(colors.error('Fail! '+err));
			    });
  		}
  	});
  }

  
}).on('close', () => {
  console.log('End of input');
});