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
var sendFunctionCode = nconf.get('sendFunctionCode') || false;

var uri = hostname+"/api/messages";

var http = require('http');
var request = require('request');
require('request').debug = true;
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

var frag = {};

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
    if (sendFunctionCode) {
      address += line.match(/POCSAG(\d+): Address:(.*?)Function: (\d)/)[3];
    }
    if (line.indexOf('Alpha:') > -1) {
      message = line.match(/Alpha:(.*?)$/)[1].trim();
      trimMessage = message.replace(/<[A-Za-z]{3}>/g,'').replace(/Ä/g,'[').replace(/Ü/g,']');
    } else if (line.indexOf('Numeric:') > -1) {
      message = line.match(/Numeric:(.*?)$/)[1].trim();
      trimMessage = message.replace(/<[A-Za-z]{3}>/g,'').replace(/Ä/g,'[').replace(/Ü/g,']');
    } else {
      message = false;
      trimMessage = '';
    }
  } else if (line.indexOf('FLEX: ') > -1) {
    address = line.match(/FLEX:.*?\[(\d*?)\] /)[1].trim();
    if (line.match( /( ALN | GPN | NUM)/ )) {
      if (line.match( / [0-9]{4}\/[0-9]\/F\/. / )) {
        // message is fragmented, hold onto it for next line
        frag[address] = line.match(/FLEX:.*?\[\d*\] ... (.*?)$/)[1].trim();
        message = false;
        trimMessage = '';
      } else if (line.match( / [0-9]{4}\/[0-9]\/C\/. / )) {
        // message is a completion of the last fragmented message
        message = line.match(/FLEX:.*?\[\d*\] ... (.*?)$/)[1].trim();
        trimMessage = frag[address]+message;
        delete frag[address];
      } else if (line.match( / [0-9]{4}\/[0-9]\/K\/. / )) {
        // message is a full message
        message = line.match(/FLEX:.*?\[\d*\] ... (.*?)$/)[1].trim();
        trimMessage = message;
      } else {
        // message doesn't have the KFC flags, treat as full message
        message = line.match(/FLEX:.*?\[\d*\] ... (.*?)$/)[1].trim();
        trimMessage = message;
      }
    }
  } else {
    address = '';
    message = false;
    trimMessage = '';
  }

  // filter out most false hits
  // if too much junk data, make sure '-p' option isn't enabled in multimon
  if (address.length > 2 && message) {
    var padAddress = padDigits(address,7);
    console.log(colors.red(time+': ')+colors.yellow(padAddress+': ')+colors.success(trimMessage));
    // now send the message
    var form = {
      address: padAddress,
      message: trimMessage,
      datetime: datetime,
      source: identifier
    };
    sendPage(form, 0);
  } else {
    console.log(colors.red(time+': ')+colors.grey(line));
  }
  
}).on('close', () => {
  console.log('Input died!');
});

var sendPage = function(message,retries) {
  var options = {
    method: 'POST',
    uri: uri,
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'PagerMon reader.js',
      apikey: apikey
    },
    form: message
  };
  rp(options)
  .then(function (body) {
    // console.log(colors.success('Message delivered. ID: '+body)); 
  })
  .catch(function (err) {
    console.log(colors.yellow('Message failed to deliver. '+err));
    if (retries < 10) {
      var retryTime = Math.pow(2, retries) * 1000;
      retries++;
      console.log(colors.yellow(`Retrying in ${retryTime} ms`));
      setTimeout(sendPage, retryTime, message, retries);
    } else {
      console.log(colors.yellow('Message failed to deliver after 10 retries, giving up'));
    }
  });
};

var padDigits = function(number, digits) {
    return Array(Math.max(digits - String(number).length + 1, 0)).join(0) + number;
};
