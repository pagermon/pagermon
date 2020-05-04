/*
Regex Replace
Allows matching and replacing
*/

var db = require('../knex/knex.js');
var logger = require('../log');
function run(trigger, scope, data, config, callback) {
    // logger.main.error('Configgerino: ' + JSON.stringify(config));
    if (data.agency) {
    	logger.main.error('It has an agency! Which is - ' + data.agency)
    	/* Grab filter from db for agency defined for this message, 
    	* then if one exists, whack raw_geolocation into the return data.
    	* Simples.
   		*/
        data.raw_geolocation = 0;
        for (var i = config.filters.length - 1; i >= 0; i--) {
            logger.main.error(' filter object ' + JSON.stringify(config.filters[i]));
            var currentFilter = config.filters[i];
            logger.main.error('current Filter: ' + JSON.stringify(currentFilter));
            if (currentFilter.agency == data.agency) {
                data.raw_geolocation = data.message.match(new RegExp(currentFilter.regex))[0];
                logger.main.error('filtered message = ' + data.raw_geolocation);
                return;
            }
        }
	}

    logger.main.error("GEOLOCATION AFTER LOOP - " + data.raw_geolocation);

	logger.main.error('data object after processing : ' + JSON.stringify(data));

    callback(data);
}

module.exports = {
    run: run
}
