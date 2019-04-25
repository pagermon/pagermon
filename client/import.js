//
// PagerMon - import.js
// 2017-06-04
// Author: Dave McKenzie
//
// Description: Takes a PDW filters.ini file and pushes it to PagerMon server
//
// Usage: cat filters.ini | node import.js --pdw
//        cat aliases.csv | node import.js
//

/*     var id = req.body.id || null;
    var address = req.body.address || 0;
    var alias = req.body.alias || 'null';
    var agency = req.body.agency || 'null';
    var color = req.body.color || 'black';
    var icon = req.body.icon || 'question';
    var ignore = req.body.ignore || 0;
    var pluginconf = JSON.stringify(req.body.pluginconf) || "{}";

    */

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

var lineCount = 0;
var columns = {};

rl.on('line', (line) => {
  lineCount++;

  var id;
  var address;
  var alias;
  var agency;
  var color;
  var icon;
  var ignore;
  var pluginconf;

  if (line.indexOf(',') > -1 && lineCount == 1 && !process.argv[2]) {
    // if this is the first line and we're not in pdw mode, get the columns
    var lineArray = line.split(',');
    console.log(lineArray);
    for (i in lineArray) {
      switch (lineArray[i]) {
        case 'id':
          columns.id = i;
          break;
        case 'address':
          columns.address = i;
          break;
        case 'alias':
          columns.alias = i;
          break;
        case 'agency':
          columns.agency = i;
          break;
        case 'color':
          columns.color = i;
          break;
        case 'icon':
          columns.icon = i;
          break;
        case 'ignore':
          columns.ignore = i;
          break;
        case 'pluginconf':
          columns.pluginconf = i;
          break;
      }
    }
    console.log(columns);
    process.exit;
  }

  // ignore non-csv lines
  if (line.indexOf(',') > -1 && lineCount != 1)  {
    parse(line, {comment: '#'}, function(err, output){
      if (process.argv[2] && process.argv[2] == '--pdw') {
        var ol = output[0];
        address = ol[1].replace(/\?/g, "_");
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
      } else {

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