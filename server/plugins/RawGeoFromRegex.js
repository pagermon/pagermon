/*
Regex Replace
Allows matching and replacing
*/
var db = require('../knex/knex.js');
var osPoint = require('ospoint');
var getJson = require('get-json')
var logger = require('../log');
var http = require('http');

function run(trigger, scope, data, config, callback) {
    // logger.main.error('Configgerino: ' + JSON.stringify(config));
    if (data.agency) {
    	logger.main.error('It has an agency! Which is - ' + data.agency)
    	/* Grab filter from db for agency defined for this message, 
    	* then if one exists, whack raw_geolocation into the return data.
    	* Simples.
   		*/
        // data.raw_geolocation = 0;
        for (var i = config.filters.length; i >= 0; i--) {
            //logger.main.error(' filter object ' + JSON.stringify(config.filters[i-1]));
            var currentFilter = config.filters[i-1];
            //logger.main.error('current Filter: ' + JSON.stringify(currentFilter));
            if (currentFilter.agency == data.agency) {
                logger.main.error('before the normalize check');
                
                data.raw_geolocation = data.message.match(new RegExp(currentFilter.regex)[0])
              
                //TODO - rename raw to processed lol
                data.coords = normalizeAddressData(
                       data.message.match(
                            new RegExp(currentFilter.regex)
                            )[0], 
                        currentFilter.flags,
                        config.location_services.api_key
                );

                logger.main.error('after the normalize check - ' + JSON.stringify(data));


                db.from('messages')
                    .where('id', '=', data.id)
                    .update({
                        raw_geolocation : data.raw_geolocation,
                        coords : coords
                    })
                    .then ((result) => { 
                        logger.main.error('RESULT OF DB OPERATION: ' + JSON.stringify(result));
                    })
                    .catch ((err) => {
                        logger.main.error('GEO DB ERROR = ' + err);
                    });
                // logger.main.error('filtered message = ' + data.raw_geolocation);
                break;
            }
        }
	}


    // logger.main.error("GEOLOCATION AFTER LOOP - " + data.raw_geolocation);

	// logger.main.error('data object after processing : ' + JSON.stringify(data));

    callback(data);
}

function normalizeAddressData(rawData, flags, apiKey)
{
    switch(flags) {
        case 'grid_reference':
            logger.main.error('grid reference switch');
            gridRefArr = rawData.trim().split(' ');
            logger.main.error('value of gridRefArr = ' + JSON.stringify(gridRefArr));
            if (!gridRefArr.length == 2) {
                logger.main.error("Unexpected length of grid reference array");
                return;
            }   
            var gridRef = new osPoint(gridRefArr[0], gridRefArr[1]);
            logger.main.error('GRID REF TO COORDS RESULT IS - ' + JSON.gridRef.toWGS84());
                return gridRef.toWGS84();

        case 'coords':
            // return 0;
            // logger.main.error('coords switch');

            // getJson(
            //     'https://us1.locationiq.com/v1/reverse.php?key=' + apikey + "&lat=LATITUDE&lon=LONGITUDE&format=json'
            //     )``
            return rawData;

        case 'full_address':
            // todo cache full_address for possibility of co-ordinate reuse
                return getJson(
                    'https://eu1.locationiq.com/v1/search.php?key=' + apiKey + '&q=' + rawData +'&format=json', 
                function(error, response) {
                    var coords = response[0].lat + ',' + response[0].lon;
                    return coords;
                }
            );
            return 0;


        default:
            logger.main.error('default switch');
            return 0;
    }
}

module.exports = {
    run: run
}