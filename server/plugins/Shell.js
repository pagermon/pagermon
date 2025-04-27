const { spawn } = require('child_process');
const fs = require('fs');
const logger = require('../log');

async function run(trigger, scope, data, config, callback) {
        if (!data.pluginconf.Shell || !data.pluginconf.Shell.enable) return callback();

        // Override ID if needed
        if (data.pluginconf.Shell.overrideAlias > 0) logger.main.debug('Override filename');
        const fileName = data.pluginconf.Shell.overrideAlias > 0 ? data.pluginconf.Shell.overrideAlias : data.alias_id;

        const filePath =
                process.platform === 'win32' ? `${process.cwd()}\\plugins\\Shell\\` : `${process.cwd()}/plugins/Shell/`;
        const fullFileName = process.platform === 'win32' ? `${fileName}.ps1` : `${fileName}.sh`;

        // Check file exist
        if (!fs.existsSync(filePath + fullFileName)) {
                logger.main.info(`File ${fullFileName} not exist`);
                return callback();
        }
        logger.main.info('Exec shell command for selected alias');

        const child =
                process.platform === 'win32'
                        ? spawn('powershell.exe', [
                                  filePath + fullFileName,
                                  `"${data.address}"`,
                                  `@'\r\n${data.message}\r\n'@`,
                                  `@'\r\n${JSON.stringify(data)}\r\n'@`,
                          ])
                        : spawn('sh', [filePath + fullFileName, data.address, data.message, JSON.stringify(data)]);

        child.stdout.on('data', function (stdOutData) {
                logger.main.debug(`ShellScript Data: ${stdOutData}`);
        });
        child.stderr.on('data', function (stdErrData) {
                logger.main.error(`ShellScript Errors: ${stdErrData}`);
        });
        child.on('exit', function () {
                // Exit code, ok = 0
                logger.main.info('ShellScript finished');
        });
        child.stdin.end(); // end input

        callback(data);
}

module.exports = {
        run,
};
