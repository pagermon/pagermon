/*

Regex Replace
Allows matching and replacing
logger.main.error('RegexReplace: Invalid config setting - Please check your settings!')

*/
var logger = require('../log');
function run(trigger, scope, data, config, callback) {
    if (config.regexReplaceMatchRegex) {
        if (data.message.match(new RegExp(config.regexReplaceMatchRegex))) {
            logger.main.info('RegexReplace: Found a match, replacing it');
	    data.message.replace(config.regexReplaceMatchRegex, config.regexReplaceString)
            logger.main.debug('RegexReplace: Message has change to: '  + data.message)
        }
    }
    callback(data);
}

module.exports = {
    run: run
}
