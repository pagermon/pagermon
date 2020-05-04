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
        for (var i = config.filters.length; i >= 0; i--) {
            logger.main.error(' filter object ' + JSON.stringify(config.filters[i-1]));
            var currentFilter = config.filters[i-1];
            logger.main.error('current Filter: ' + JSON.stringify(currentFilter));
            if (currentFilter.agency == data.agency) {
                data.raw_geolocation = data.message.match(new RegExp(currentFilter.regex))[0];
                db.from('messages')
                    .where('id', '=', data.id)
                    .update({
                        raw_geolocation : data.raw_geolocation
                    })
                    .then ((result) => { 
                        logger.main.error('RESULT OF DB OPERATION: ' + JSON.stringify(result));
                    })
                    .catch ((err) => {
                        logger.main.error('GEO DB ERROR = ' + err);
                    });
                logger.main.error('filtered message = ' + data.raw_geolocation);
                break;
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
