var spawn = require("child_process").spawn;
var fs = require('fs');
var logger = require('../log');


function run(trigger, scope, data, config, callback) {

    if (data.alias.pluginconf.Shell && data.alias.pluginconf.Shell.enable) {

    var file_name = data.alias_id;

    // Override ID if needed
        if (data.alias.pluginconf.Shell.overrideAlias > 0) {
      logger.main.debug('Override filename');
            var file_name = data.alias.pluginconf.Shell.overrideAlias;
    }

    if(process.platform === "win32"){
      // Windows platform, Win 64bits too
      var file_path = process.cwd()+'\\plugins\\Shell\\';
      var full_file_name = file_name+'.ps1';
    }else{
      // Others, 'aix', 'darwin', 'freebsd', 'linux', 'openbsd', 'sunos'
      var file_path = process.cwd()+'/plugins/Shell/';
      var full_file_name = file_name+'.sh';
    }

    // Check file exist
    if(fs.existsSync(file_path+full_file_name)){
        logger.main.info('Exec shell command for selected alias');

        if(process.platform === "win32"){
          var child = spawn("powershell.exe", [file_path+full_file_name, '"'+data.address+'"', "@'\r\n"+data.message+"\r\n'@", "@'\r\n"+JSON.stringify(data)+"\r\n'@"]); //
        }else{
          var child = spawn("sh", [file_path+full_file_name, data.address, data.message, JSON.stringify(data)]);
        }

        child.stdout.on("data",function(data){
            logger.main.debug("ShellScript Data: " + data);
        });
        child.stderr.on("data",function(data){
            logger.main.error("ShellScript Errors: " + data);
        });
        child.on("exit",function(code){ // Exit code, ok = 0
            logger.main.info("ShellScript finished");
        });
        child.stdin.end(); //end input

    }else{
      logger.main.info('File '+full_file_name+' not exist');
    }
  }
}

module.exports = {
    run: run
};
