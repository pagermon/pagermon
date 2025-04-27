const axios = require('axios').default;
const logger = require('../log');

async function run(trigger, scope, data, config, callback) {
        const ntfyConf = data.pluginconf.Ntfysh;
        if (!ntfyConf || !ntfyConf.enable) return callback();
        try {
                if (config.globalServer === 0 || config.globalServer === '0' || !config.globalServer) {
                        logger.main.error(`Ntfy.Sh: ${data.address} No Server URL Set`);
                        return callback();
                }
                if (ntfyConf.topic === 0 || ntfyConf.topic === '0' || !ntfyConf.topic) {
                        logger.main.error(`Ntfy.Sh: ${data.address} No Topic Set`);
                        return callback();
                }
                if (
                        config.authentication.value === 'username' &&
                        (config.serverUsername === 0 ||
                                config.serverUsername === '0' ||
                                !config.serverUsername ||
                                config.serverPassword === 0 ||
                                config.serverPassword === '0' ||
                                !config.serverPassword)
                ) {
                        logger.main.error(
                                `Ntfy.Sh: ${data.address} Username Authentication enabled and username or password not set`
                        );
                        return callback();
                }
                if (
                        config.authentication.value === 'apikey' &&
                        (config.serverPassword === 0 || config.serverPassword === '0' || !config.serverPassword)
                ) {
                        logger.main.error(`Ntfy.Sh: ${data.address} API Authentication enabled and password not set`);
                        return callback();
                }
                const url = `${config.globalServer}/${ntfyConf.topic}`;
                const headers = {};
                if (config.authentication.value === 'username') {
                        const auth = `Basic ${Buffer.from(
                                `${config.serverUsername}:${config.serverPassword}`,
                                'utf8'
                        ).toString('base64')}`;
                        headers.Authorization = auth;
                } else if (config.authentication.value === 'apikey') {
                        const auth = `Bearer ${config.serverPassword}`;
                        headers.Authorization = auth;
                }
                if (ntfyConf.icon) {
                        headers.Icon = ntfyConf.icon;
                }
                if (ntfyConf.tag) {
                        headers.Tags = ntfyConf.tag;
                }
                headers.title = `${data.agency} - ${data.alias}`;
                await axios.post(url, data.message, {
                        headers,
                });

                logger.main.info('Ntfy.Sh: Message Sent');
        } catch (error) {
                if (error.response) {
                        // The request was made and the server responded with a status code
                        // that falls out of the range of 2xx
                        logger.main.error(`Ntfy.Sh: Headers: ${JSON.stringify(error.response.headers)}`);
                        logger.main.error(`Ntfy.Sh: Data: ${JSON.stringify(error.response.data)}`);
                        logger.main.error(`Ntfy.Sh: Status Code: ${error.response.status}`);
                } else if (error.request) {
                        // The request was made but no response was received
                        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
                        // http.ClientRequest in node.js
                        logger.main.error(`Ntfy.Sh: No response:${JSON.stringify(error.request)}`);
                } else {
                        // Something happened in setting up the request that triggered an Error
                        logger.main.error(`Ntfy.Sh: Error:${error.message}`);
                }
        }
        callback();
}

module.exports = {
        run,
};
