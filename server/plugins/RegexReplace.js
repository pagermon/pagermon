/*
Regex Replace
Allows matching and replacing
*/
const logger = require('../log');

function run(trigger, scope, data, config, callback) {
        if (!config.regexReplaceMatchRegex) return callback();

        if (data.message.match(new RegExp(config.regexReplaceMatchRegex))) {
                logger.main.info('RegexReplace: Found a match, replacing it');
                data.message = data.message.replace(
                        new RegExp(config.regexReplaceMatchRegex),
                        config.regexReplaceString
                );
                logger.main.debug(`RegexReplace: Message has changed to: ${data.message}`);
        }
        callback(data);
}

module.exports = {
        run,
};
