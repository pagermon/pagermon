var spawn = require("child_process").spawn;
var fs = require('fs');


function run(trigger, scope, data, config, callback) {

  if(data.pluginconf.Shell.enable){
    var file_path = process.cwd()+'/plugins/Shell/';
    var file_name = data.alias_id;

    // Override ID if needed
    if(data.pluginconf.Shell.overrideAlias > 0){
      console.log('Override filename')
      var file_name = data.pluginconf.Shell.overrideAlias;
    }

    if(process.platform === "win32"){
      // Windows platform, Win 64bits too
      var full_file_name = file_name+'.ps1';
    }else{
      // Others, 'aix', 'darwin', 'freebsd', 'linux', 'openbsd', 'sunos'
      var full_file_name = file_name+'.sh';
    }

    // Check file exist
    if(fs.existsSync(file_path+full_file_name)){
        console.log('Exec shell command for selected alias')

        if(process.platform === "win32"){
          var child = spawn("powershell.exe", [file_path+full_file_name, data.address, data.message, JSON.stringify(data)]);
        }else{
          var child = spawn("sh", [file_path+full_file_name, data.address, data.message, JSON.stringify(data)]);
        }

        child.stdout.on("data",function(data){
            console.log("ShellScript Data: " + data);
        });
        child.stderr.on("data",function(data){
            console.log("ShellScript Errors: " + data);
        });
        child.on("exit",function(code){ // Exit code, ok = 0
            console.log("ShellScript finished");
        });
        child.stdin.end(); //end input

    }else{
      console.log('File '+full_file_name+' not exist');
    }
  }
}

module.exports = {
    run: run
}
