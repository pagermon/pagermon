var { spawn } = require('child_process');
var fs = require('fs');
var logger = require('../log');

function run(trigger, scope, data, config, callback) {
        if (!data.plubincon.Shell || !data.pluginconf.Shell.enable) return callback(data);

        // Override ID if needed
        const fileName = data.pluginconf.Shell.overrideAlias > 0 ? data.pluginconf.Shell.overrideAlias : data.alias_id;
        if (data.pluginconf.Shell.overrideAlias > 0) logger.main.debug('Override filename');

        const filePath =
                process.platform === 'win32' ? `${process.cwd()}\\plugins\\Shell\\` : `${process.cwd()}/plugins/Shell/`;
        const fullFileName = process.platform === 'win32' ? `${fileName}.ps1` : `${fileName}.sh`;

        const shell = data.pluginconf.Shell.shell || process.platform === 'win32' ? 'powershell.exe' : 'sh';
        if (process.platform === 'win32' && shell !== 'powershell.exe') {
                logger.main.error('Shell must be powershell.exe on Windows');
                return callback(data);
        }
        if (process.platform !== 'win32' && shell === 'powershell.exe') {
                logger.main.error('Powershell is only available on Windows');
                return callback(data);
        }

        // Check file exist
        if (!fs.existsSync(filePath + fullFileName)) {
                logger.main.info(`File ${fullFileName} not exist`);
                return callback(data);
        }

        logger.main.info('Exec shell command for selected alias');

        const child =
                shell === 'powershell.exe'
                        ? spawn('powershell.exe', [
                                  filePath + fullFileName,
                                  `"${data.address}"`,
                                  `@'\r\n${data.message}\r\n'@`,
                                  `@'\r\n${JSON.stringify(data)}\r\n'@`,
                          ])
                        : spawn(shell, [filePath + fullFileName, data.address, data.message, JSON.stringify(data)]);

        child.stdout.on('data', function(innerData) {
                logger.main.debug(`ShellScript Data: ${innerData}`);
        });
        child.stderr.on('data', function(innerData) {
                logger.main.error(`ShellScript Errors: ${innerData}`);
        });
        child.on('exit', function(code) {
                // Exit code, ok = 0
                logger.main.info('ShellScript finished');
        });
        child.stdin.end(); // end input

        callback(data);
}

module.exports = {
        run,
};
