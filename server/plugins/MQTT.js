const mqtt = require('mqtt');
const logger = require('../log');

function run(trigger, scope, data, config, callback) {
    const mConf = data.pluginconf.MQTT;
    if (mConf && mConf.enable) {
        logger.main.debug('MQTT: connecting to MQTT server');

        const client = mqtt.connect(config.URL, {
            username: config.username,
            password: config.password,
        });

        client.on('error', error => {
            logger.main.error(`MQTT: failed to connect to MQTT server: ${error}`);
            callback();
        });

        client.on('connect', () => {
            logger.main.debug('MQTT: connected to MQTT server');

            const baseTopic = config.baseTopic || 'pagermon';
            const alias = data.alias;
            const aliasId = data.alias_id;
            const stateData = {
                id: data.id,
                address: data.address,
                message: data.message,
                source: data.source,
                timestamp: data.timestamp,
                alias: data.alias,
                alias_id: data.alias_id,
                agency: data.agency,
                icon: data.icon,
                color: data.color,
            };

            logger.main.debug('MQTT: publishing messages');

            // Publish latest message
            client.publish(`${baseTopic}`, JSON.stringify(stateData));

            // Publish latest message per alias
            client.publish(`${baseTopic}/${aliasId}`, JSON.stringify(stateData));

            if (config.homeAssistant === true) {
                // If home assistant integration activated, send discovery message
                const discoveryTopic = config.discoveryTopic || 'homeassistant';
                const device = {
                    identifiers: 'pagermon',
                    model: 'PagerMon',
                    name: 'PagerMon',
                };

                logger.main.debug('MQTT: publishing home assistant discovery messages');

                // Configuration for latest message
                client.publish(
                    `${discoveryTopic}/sensor/pagermon/latest_message/config`,
                    JSON.stringify({
                        device,
                        state_topic: `${baseTopic}`,
                        json_attributes_topic: `${baseTopic}`,
                        name: `Latest message`,
                        unique_id: `latest_message`,
                        value_template: `{{ value_json.message }}`,
                    }),
                    { retain: true }
                );

                // Configuration for latest message per alias
                client.publish(
                    `${discoveryTopic}/sensor/pagermon/${aliasId}_message/config`,
                    JSON.stringify({
                        device,
                        state_topic: `${baseTopic}/${aliasId}`,
                        json_attributes_topic: `${baseTopic}/${aliasId}`,
                        name: `${alias} message`,
                        unique_id: `${aliasId}_message`,
                        value_template: `{{ value_json.message }}`,
                    }),
                    { retain: true }
                );
            }

            logger.main.debug('MQTT: messages published');

            client.end();
            callback();
        });
    } else {
        callback();
    }
}

module.exports = {
    run,
};
