/**
* PagerMon - reader.js
* 2017-06-04
* Author: Dave McKenzie
* 2019-44-11
* Rewrite: eopo
*
* Description: Takes output of multimon-ng and pushes to PagerMon server
*
* Usage: Invoke via a shell script, ideally
* 		If not, just pipe multimon's output to it
*
* Example: reader.sh
*/

/**
 * Module loading
 */
const fs = require("fs");
const nconf = require("nconf");
const http = require('http');
const request = require('request');
const rp = require('request-promise-native');
const moment = require('moment');
const colors = require('colors/safe');
const readline = require('readline');


/**
 * Module configuration
 */
require('request').debug = true;
colors.setTheme({
    success: ['white', 'bold', 'bgBlue'],
    error: ['red', 'bold', 'bgwhite']
});


/**
 * Variable initialization
 */
let frag = {};
const conf_defaults = JSON.parse(fs.readFileSync('./config/default.json', 'utf8'));
const conf_file = './config/config.json';
const functionAlphaNum = {
    0: 'a',
    1: 'b',
    2: 'c',
    3: 'd'
};


/**
 * Read config. If no config exists, take 'default' as template.
 */

if( ! fs.existsSync(conf_file) ) {
    console.log('Please input a pagermon API key:');
    conf_defaults.apikey = process.stdin.on('data', function(data) { return data; });
    fs.writeFileSync( conf_file, JSON.stringify(conf_defaults,null, 2) );
    console.log('A config file containing your API key has been generated at '+conf_file);

    return;
}


/**
 * Load configuration from args, env, config and defaults.
 */
nconf.argv({
        "k": {
            alias: "apikey",
            describe: "The pagermon API key",
            demand: false,
        },
        "h": {
            alias: 'hostname',
            describe: 'The host under which pagermon can be accessed',
            demand: false,

        },
        "p": {
            alias: 'port',
            describe: 'The port under which pagermon can be accessed',
            demand: false,
            parseValues: true,
        }
    })
    .env()
    .file({file: conf_file})
    .defaults({
        "hostname": "http://127.0.0.1",
        "port": "3000",
        "identifier": "TEST",
        "apiEndpoint": "/api/messages",

    })
    .required(['apikey','port','hostname','identifier']);

const uri = nconf.get('hostname')+":"+nconf.get('port')+nconf.get('apiEndpoint');

/**
 * Standard Input
 * @type {Interface}
 */
const rl = readline.createInterface({
    input: process.stdin,
    terminal: true
});

rl.on('line', (line) => {
    Message.handleMessage(raw);
});


/**
 * Class definitions
 */

class Message {
    constructor() {
        this._timestamp = moment();
    }
    set address(address) {
        if (address.length() < 7) {
            this._address = padDigits(address, 7);
        }
    }
    get address() {
        return this._address;
    }
    set functionCode(functionCode) {
        this._functionCode = functionCode;
    }
    get functionCode() {
        return this._functionCode;
    }
    set message(message) {
        this._message = message.trim();
    }
    get message() {
        return this._message;
    }
    set messageType(messageType) {
        this._messageType = messageType;
    }
    get messageType() {
        return this._messageType;
    }

    get time () {
        return Message.humanizeTime(this._timestamp)
    }

    static humanizeTime (timestamp) {
        return timestamp.format("YYYY-MM-DD HH:mm:ss")
    }

    static getProtocol(raw) {
        if (/^POCSAG(\d+):/.test(raw)) return 'POCSAG';
        else if (/^FLEX/.test(raw)) return 'FLEX';
    }

    static handlePocsag(raw) {
        const message = new Message();
        const matched = raw.match(/POCSAG(\d+): Address:(.*?)Function: (\d)/);
        message.address = matched[2].trim();
        message.functionCode = functionAlphaNum[matched[3]];
        if (/Alpha: /.test(raw)) {
            message.messageType = 'Alpha';
            message.message = raw.match(/Alpha:(.*?)$/)[1].trim();

        }
        else if (/Numeric: /.test(raw)) {
            message.messageType = 'Numeric'
            message.message = raw.match(/Numeric:(.*?)$/)[1].trim();
        }
        else message.message = null;

        return message;
    }

    static handleFlex(raw) {
        const matched = raw.match(/FLEX:.*? 0-9]{4}\/[0-9]\/(F|C|K)\/.( ALN | GPN | NUM) \[(\d*?)\] (.*?)$/);
        const address = matched[3].trim();
        const controlChar = matched[1];
        if (controlChar === 'F') {
            frag[address] = matched[4].trim();
            return null;
        } else if (controlChar === 'C') {
            const message = new Message();
            message.messageType = matched[2].trim();
            message.address = address;
            message.message = frag[address]+matched[4].trim();
        } else {
            const message = new Message();
            message.messageType = matched[2].trim();
            message.address = address;
            message.message = matched[4];
        }
        return message;
    }

    static handleMessage(raw) {
        if (Message.getProtocol(raw) === "POCSAG") {
            const message = Message.handlePocsag(raw);
        } else if (Message.getProtocol(raw) === "FLEX") {
            const message = Message.handleFlex(raw)
        } else return null;
        if (message != null) {
            console.log(colors.red(message.timeHuman+': ')+colors.yellow(message.address+': ')+colors.success(message.message));
            sendPage(Message, 0);
        } else {
            console.log(colors.red(Message.humanizeTime(moment())+': ')+colors.grey(raw));
        }
    }
}

var sendPage = function(message,retries) {
    var options = {
        method: 'POST',
        uri: uri,
        headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'PagerMon reader.js',
            apikey: nconf.get('apikey'),
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