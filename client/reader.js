//
// PagerMon - reader.js
// 2020-07-25
// Author: Dave McKenzie and the Pagermon contributors
//
// Description: Takes output of multimon-ng and pushes to PagerMon server
//
// Usage: Invoke via a shell script, ideally
// 		If not, just pipe multimon's output to it
//
// Example: reader.sh
//

//PACKAGE LOADING
const fs = require('fs');
const nConf = require('nconf');
require('request').debug = true;
const rp = require('request-promise-native');
const moment = require('moment');
const colors = require('colors/safe');
const readline = require('readline');


// CONFIG AND SETUP
// Create config file if it does not exist, and set defaults
const conf_defaults = require('./config/default.json');
const conf_file = './config/config.json';
if( ! fs.existsSync(conf_file) ) {
    fs.writeFileSync( conf_file, JSON.stringify(conf_defaults,null, 2) );
    console.log('created config file - set your api key in '+conf_file);
    return;
}

// Load the existing config file
nConf.file({file: conf_file});
nConf.load();

const hostname = nConf.get('hostname');
const apikey = nConf.get('apikey');
const identifier = nConf.get('identifier');
const sendFunctionCode = nConf.get('sendFunctionCode') || false;
const useTimestamp = nConf.get('useTimestamp') || true;
let uri;

//Check if hostname is in a valid format - currently only removes trailing slash - possibly expand to validate the whole URI? 
if(hostname.substr(-1) === '/') {
  uri = hostname+'api/messages';
} else {
  uri = hostname+'/api/messages'
}

//Commandline color setup
colors.setTheme({
  success: ['white', 'bold', 'bgBlue'],
  error: ['red', 'bold', 'bgwhite']
});

//Readline setup
const rl = readline.createInterface({
    input: process.stdin,
    terminal: true
});

//Variable initialization
let frags = {};
let messages = [];

//MESSAGE HANDLING
rl.on('line', (line) => {
  //console.log(`Received: ${line.trim()}`);
  let lineObj = {
    time: moment().format("YYYY-MM-DD HH:mm:ss"),
    datetime: moment().unix(),
    line: line
  }
  // TODO: pad address with zeros for better address matching
//  if (line.indexOf('POCSAG512: Address:') > -1) {

  if (/POCSAG(\d+): Address: /.test(line) ) {
    messages = messages.concat(pocsagHandler(lineObj));
  } else if (/FLEX[:|]/.test(line)) {
    messages = messages.concat(flexHandler(lineObj));
  } else {
    console.log(colors.red(lineObj.time+' - No protocol found: ')+colors.grey(lineObj.line));
  }

  // filter out most false hits
  // if too much junk data, make sure '-p' option isn't enabled in multimon
  while (messages.length > 0) {
    let message = messages.shift();
    if (message.address.length > 2 && message.message) {
      message.address = padDigits(message.address,7);
      console.log(colors.red(message.time+': ')+colors.yellow(message.protocol+' - '+message.address+': ')+colors.grey({message}));
      // now send the message
      const form = {
        ...message,
        source: identifier
      };
      sendPage(form, 0);
    }
    else {
      console.log(colors.red(message.time+': ')+colors.grey(line));
    }
  }

}).on('close', () => {
  console.log('Input died!');
});

//PROTOCOL HANDLING
const pocsagHandler = function(lineObj) {
  let message = {
    protocol: 'POCSAG',
    address: lineObj.line.match(/POCSAG(\d+): Address:(.*?)Function/)[2].trim(),
    datetime: lineObj.datetime,
    time: lineObj.time,
  };

  if (sendFunctionCode) {
    message.functionCode = lineObj.line.match(/POCSAG(\d+): Address:(.*?)Function: (\d)/)[3]
    message.address += message.functionCode;
  }
  if (lineObj.line.indexOf('Alpha:') > -1) {
    message.type = 'Alphanumeric';
    message.message = lineObj.line.match(/Alpha:(.*?)$/)[1].trim();
    if (useTimestamp) {
      if (message.message.match(/\d{2} \w+ \d{4} \d{2}:\d{2}:\d{2}/)) {
        let timeString = message.message.match(/\d+ \w+ \d+ \d{2}:\d{2}:\d{2}/)[0];
        if (moment(timeString, 'DD MMMM YYYY HH:mm:ss').isValid()) {
          message = {
            ...message,
            datetime: moment(timeString, 'DD MMMM YYYY HH:mm:ss').unix(),
            message: message.message.replace(/\d{2} \w+ \d{4} \d{2}:\d{2}:\d{2}/,'')
          };
        }
      } else if (message.message.match(/\d+-\d+-\d+ \d{2}:\d{2}:\d{2}/)) {
        let timeString = message.message.match(/\d+-\d+-\d+ \d{2}:\d{2}:\d{2}/)[0];
        if (moment(timeString).isValid()) {
          message = {
            ...message,
            datetime: moment(timeString).unix(),
            message: message.message.replace(/\d+-\d+-\d+ \d{2}:\d{2}:\d{2}/, '')
          };
        }
      }
    }
    message.message = message.message.replace(/<(ETX|EOT)>.*/g,'').replace(/<(CR)>/,'\r').replace(/<(LF)>/,'\n').trim();
    //TODO: Do we need this part? Multimon has a charset function since a year or so, so the error that this fixed should not occur anymore
    message.message = message.message.replace(/Ä/g,'[').replace(/Ü/g,']');
  }
  else if (lineObj.line.indexOf('Numeric:') > -1) {
    message = {
      ...message,
      message: lineObj.line.match(/Numeric:(.*?)$/)[1].trim()
    }
    message.message = message.message.replace(/<(ETX|EOT)>.*/g,'').trim();
    //TODO: Do we need this part? Multimon has a charset function since a year or so, so the error that this fixed should not occur anymore
    message.message = message.message.replace(/Ä/g,'[').replace(/Ü/g,']');
  }
  else {
    message = {...message,
      type: 'Empty',
      message: null
    };
  }
  return [message];
}
const flexHandler = function(lineObj) {
  let messages = [];
  let tempMessage = {
    protocol: 'FLEX',
    addressString: lineObj.line.match(/FLEX[:|] ?.*?[\[|]([\d ]*)[\]| ]/)[1].trim(),
    datetime: lineObj.datetime,
    time: lineObj.time
  }

  if (useTimestamp) {
    if (lineObj.line.match(/FLEX[:|] ?\d{2} \w+ \d{4} \d{2}:\d{2}:\d{2}/)) {
      let timeString = lineObj.line.match(/\d+ \w+ \d+ \d{2}:\d{2}:\d{2}/)[0];
      if (moment(timeString, 'DD MMMM YYYY HH:mm:ss').isValid()) {
        tempMessage.datetime = moment(timeString, 'DD MMMM YYYY HH:mm:ss').unix();
      }
    }
    else if (lineObj.line.match(/FLEX[:|] ?\d+-\d+-\d+ \d{2}:\d{2}:\d{2}/)) {
      let timeString = lineObj.line.match(/\d+-\d+-\d+ \d{2}:\d{2}:\d{2}/)[0];
      if (moment(timeString).isValid()) {
        tempMessage.datetime = moment(timeString).unix();
      }
    }
  }
  tempMessage.message = lineObj.line.match(/FLEX[:|].*[|\[][0-9 ]*[|\]] ?...[ |](.+)/)[1].trim();

  if (lineObj.line.match( /([ |]ALN[ |]|[ |]GPN[ |]|[ |]NUM[ |])/ )) {
    if (lineObj.line.match( /[ |][0-9]{4}\/[0-9]\/F\/.[ |]/ )) {
      // message is fragmented, hold onto it for next line
      tempMessage.message = lineObj.line.match(/FLEX[:|].*[|\[][0-9 ]*[|\]] ?...[ |](.+)/)[1].trim();
      frags[tempMessage.addressString] = tempMessage;
    }
    else if (lineObj.line.match( /[ |][0-9]{4}\/[0-9]\/C\/.[ |]/ )) {
      // message is a completion of the last fragmented message
      tempMessage.message = frags[tempMessage.addressString]+tempMessage.message;
      delete frags[tempMessage.addressString];
    } /* Todo: Not needed, since redundant with part below. Maybe keep for future use.
    else if (lineObj.line.match( /[ |][0-9]{4}\/[0-9]\/K\/.[ |]/ )) {
      // message is a full message
      tempMessage.message = trimMessage;
    }
    Todo: Not needed, since fragmentation handling does only jump in, when needed. Otherwise, message is set directly.
    else {
      // message doesn't have the KFC flags, treat as full message
      tempMessage.message = trimMessage;
    }
     **/
  }

  let addresses = tempMessage.addressString.split(' ');
  delete tempMessage.addressString;
  addresses.forEach((address) => {
    messages.push({
      ...tempMessage,
      address: address
    });
  });
  return messages;
}

//HELPER FUNCTION DEFINITIONS
const sendPage = function(message,retries) {
  const options = {
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
      const retryTime = Math.pow(2, retries) * 1000;
      retries++;
      console.log(colors.yellow(`Retrying in ${retryTime} ms`));
      setTimeout(sendPage, retryTime, message, retries);
    }
    else {
      console.log(colors.yellow('Message failed to deliver after 10 retries, giving up'));
    }
  });
}

const padDigits = function(number, digits) {
    return Array(Math.max(digits - String(number).length + 1, 0)).join('0') + number;
}
