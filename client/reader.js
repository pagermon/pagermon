// reader.js

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

//
// Updated Dec 2024:
// Validates regex matches: Verifies if match is successful and groups are present. This handles a null exception where we read corrupted input on stdin.
// Error handling for exceptions: Wraps processing logic inside a try catch block.
// Logging: If we do encounter an exception, we log to console so you can see if your input needs adjusting (or this regex needs adjusting!)
// Regex pattern consts: Constant regex are now defined in a group near the top of the script for easier maintainability and adjustment
// Adjusted top level exit from return to process.exit(0) after creating config if no config exists (stops script on exit)
// Replaced padDigits with string.prototype.padStart
// Enabled strict mode to help catch undefineds when debugging null exceptions, remains enabled

'use strict';

// CONFIG
const fs = require('fs');
const nconf = require('nconf');
const conf_defaults = require('./config/default.json');
const confFile = './config/config.json';

if (!fs.existsSync(confFile)) {
    fs.writeFileSync(confFile, JSON.stringify(conf_defaults, null, 2));
    console.log('Created config file - set your API key in ' + confFile);
    process.exit(0); // Use process.exit instead of return at top level
}

nconf.file({ file: confFile });
nconf.load();

const hostname = nconf.get('hostname');
const apikey = nconf.get('apikey');
const identifier = nconf.get('identifier');
const sendFunctionCode = nconf.get('sendFunctionCode') || false;
const useTimestamp = nconf.get('useTimestamp') || true;
const EASOpts = nconf.get('EAS'); // Import EAS Config Object

// Validate hostname
const uri = hostname.endsWith('/') ? `${hostname.slice(0, -1)}/api/messages` : `${hostname}/api/messages`;

const http = require('http');
const request = require('request');
require('request').debug = true;
const rp = require('request-promise-native');
const moment = require('moment');
const colors = require('colors/safe');
const readline = require('readline');
const SAME = require('jsame'); // Import jSAME EAS decode

// Set color themes
colors.setTheme({
    success: ['white', 'bold', 'bgBlue'],
    error: ['red', 'bold', 'bgwhite']
});

// Initialize readline interface
const rl = readline.createInterface({
    input: process.stdin,
    terminal: true
});

// Initialize fragmentation storage
let frag = {};

// Define regex patterns as constants
const POCSAG_ADDRESS_REGEX = /POCSAG(\d+): Address:(.*?)Function/;
const POCSAG_FUNCTION_REGEX = /POCSAG(\d+): Address:(.*?)Function: (\d)/;
const FLEX_ADDRESS_REGEX = /FLEX[:|] ?.*?[\[|](\d*?)[\]| ]/;
const FLEX_MESSAGE_REGEX = /FLEX[:|].*[|\[][0-9 ]*[|\]] ?...[ |](.+)/;
const ALN_GPN_NUM_REGEX = /([ |]ALN[ |]|[ |]GPN[ |]|[ |]NUM[ |])/;
const EAS_REGEX = /(EAS[:|]|ZCZC-)/;

// Line event handler
rl.on('line', (line) => {
    try {
        let time = moment().format("YYYY-MM-DD HH:mm:ss");
        let timeString = '';
        let datetime = moment().unix();
        let address = '';
        let message = false;
        let trimMessage = '';

        // POCSAG Processing
        if (/POCSAG(\d+): Address: /.test(line)) {
            const matchAddress = line.match(POCSAG_ADDRESS_REGEX);
            if (matchAddress && matchAddress[2]) {
                address = matchAddress[2].trim();
            } else {
                console.error(`Failed to extract address from line: "${line}"`);
                return; // Skip processing this line
            }

            if (sendFunctionCode) {
                const matchFunction = line.match(POCSAG_FUNCTION_REGEX);
                if (matchFunction && matchFunction[3]) {
                    address += matchFunction[3];
                } else {
                    console.error(`Failed to extract function code from line: "${line}"`);
                }
            }

            if (line.includes('Alpha:')) {
                const alphaMatch = line.match(/Alpha:(.*?)$/);
                if (alphaMatch && alphaMatch[1]) {
                    message = alphaMatch[1].trim();
                    if (useTimestamp) {
                        let timestampMatch = message.match(/\d{2} \w+ \d{4} \d{2}:\d{2}:\d{2}/) ||
                                             message.match(/\d+-\d+-\d+ \d{2}:\d+:\d{2}/);
                        if (timestampMatch) {
                            timeString = timestampMatch[0];
                            if (moment(timeString, ['DD MMMM YYYY HH:mm:ss', 'YYYY-MM-DD HH:mm:ss']).isValid()) {
                                datetime = moment(timeString, ['DD MMMM YYYY HH:mm:ss', 'YYYY-MM-DD HH:mm:ss']).unix();
                                message = message.replace(timestampMatch[0], '').trim();
                            }
                        }
                    }
                    trimMessage = message.replace(/<[A-Za-z]{3}>/g, '').replace(/Ä/g, '[').replace(/Ü/g, ']').trim();
                } else {
                    console.error(`Failed to extract Alpha message from line: "${line}"`);
                }
            } else if (line.includes('Numeric:')) {
                const numericMatch = line.match(/Numeric:(.*?)$/);
                if (numericMatch && numericMatch[1]) {
                    message = numericMatch[1].trim();
                    trimMessage = message.replace(/<[A-Za-z]{3}>/g, '').replace(/Ä/g, '[').replace(/Ü/g, ']');
                } else {
                    console.error(`Failed to extract Numeric message from line: "${line}"`);
                }
            }
        }
        // FLEX Processing
        else if (FLEX_ADDRESS_REGEX.test(line)) {
            const matchFlexAddress = line.match(FLEX_ADDRESS_REGEX);
            if (matchFlexAddress && matchFlexAddress[1]) {
                address = matchFlexAddress[1].trim();
            } else {
                console.error(`Failed to extract FLEX address from line: "${line}"`);
                return;
            }

            if (useTimestamp) {
                const timestampMatch = line.match(/FLEX[:|] ?\d{2} \w+ \d{4} \d{2}:\d{2}:\d{2}/) ||
                                       line.match(/FLEX[:|] ?\d+-\d+-\d+ \d{2}:\d{2}:\d{2}/);
                if (timestampMatch) {
                    timeString = timestampMatch[0].replace(/FLEX[:|] ?/, '');
                    if (moment(timeString, ['DD MMMM YYYY HH:mm:ss', 'YYYY-MM-DD HH:mm:ss']).isValid()) {
                        datetime = moment(timeString, ['DD MMMM YYYY HH:mm:ss', 'YYYY-MM-DD HH:mm:ss']).unix();
                    }
                }
            }

            if (ALN_GPN_NUM_REGEX.test(line)) {
                const messageMatch = line.match(FLEX_MESSAGE_REGEX);
                if (messageMatch && messageMatch[1]) {
                    message = messageMatch[1].trim();
                    if (line.match(/[ |][0-9]{4}\/[0-9]\/F\/.[ |]/)) {
                        // Fragmented message
                        frag[address] = message;
                        message = false;
                        trimMessage = '';
                    } else if (line.match(/[ |][0-9]{4}\/[0-9]\/C\/.[ |]/)) {
                        // Completion of fragmented message
                        trimMessage = (frag[address] || '') + message;
                        delete frag[address];
                    } else if (line.match(/[ |][0-9]{4}\/[0-9]\/K\/.[ |]/)) {
                        // Full message
                        trimMessage = message;
                    } else {
                        // Treat as full message
                        trimMessage = message;
                    }
                } else {
                    console.error(`Failed to extract FLEX message from line: "${line}"`);
                }
            }
        }
        // EAS Processing
        else if (EAS_REGEX.test(line)) {
            const decodedMessage = SAME.decode(line, EASOpts.excludeEvents, EASOpts.includeFIPS);
            if (decodedMessage) {
                if (EASOpts.addressAddType) {
                    address = `${decodedMessage["LLLL-ORG"]}-${decodedMessage["type"]}`;
                } else {
                    address = decodedMessage["LLLL-ORG"];
                }
                message = decodedMessage["MESSAGE"];
                trimMessage = decodedMessage["MESSAGE"];
                datetime = moment().unix(); // Current time
            } else {
                console.error(`Failed to decode EAS message from line: "${line}"`);
            }
        }
        // Non-matching lines
        else {
            address = '';
            message = false;
            trimMessage = '';
        }

        // Filter out most false hits
        if (address.length > 2 && message) {
            const padAddress = padDigits(address, 7);
            console.log(colors.red(`${time}: `) + colors.yellow(`${padAddress}: `) + colors.success(trimMessage));

            // Prepare the message payload
            const form = {
                address: padAddress,
                message: trimMessage,
                datetime: datetime,
                source: identifier
            };

            // Send the message
            sendPage(form, 0);
        } else {
            console.log(colors.red(`${time}: `) + colors.grey(line));
        }
    } catch (err) {
        console.error(`Error processing line: "${line}"`);
        console.error(err);
    }
}).on('close', () => {
    console.log('Input died!');
});

// Function to send the page with retries
function sendPage(message, retries) {
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
        .then((body) => {
            // Optionally log successful delivery
            // console.log(colors.success('Message delivered. ID: ' + body));
        })
        .catch((err) => {
            console.log(colors.yellow('Message failed to deliver. ' + err));
            if (retries < 10) {
                const retryTime = Math.pow(2, retries) * 1000;
                retries++;
                console.log(colors.yellow(`Retrying in ${retryTime} ms`));
                setTimeout(() => sendPage(message, retries), retryTime);
            } else {
                console.log(colors.yellow('Message failed to deliver after 10 retries, giving up'));
            }
        });
}

// Function to pad digits with leading zeros
function padDigits(number, digits) {
    return String(number).padStart(digits, '0');
}
