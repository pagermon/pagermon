var exec = require('child_process').exec;
var fs = require('fs');


function run(trigger, scope, data, config, callback) {

    var available_language = {
      'sh':'sh',
      'php':'/usr/bin/php',
      'python':'/usr/bin/python',
      'python3':'/usr/bin/python3',
    };
    var language_ext = {
      'sh':'sh',
      'php':'php',
      'python':'py',
      'python3':'py',
    };
    var used_program = 'sh'; // Default programm
    var used_ext = 'sh'; // Default programm

    if(data.pluginconf.Shell.enable){

      var file_path = process.cwd()+'/plugins/Shell/';
      var file_name = data.alias_id+'.'+used_ext;

      if(typeof data.pluginconf.Shell.language != "undefined" && typeof available_language[data.pluginconf.Shell.language.value] != "undefined"){
        used_program = available_language[data.pluginconf.Shell.language.value];
        used_ext = language_ext[data.pluginconf.Shell.language.value];
      }

      // Check file exist
      if(data.pluginconf.Shell.overrideAlias > 0){
        console.log('Override filename')
        var file_name = data.pluginconf.Shell.overrideAlias+'.'+used_ext;
      }

      

      
   
      if(fs.existsSync(file_path+file_name)){
          console.log('Exec shell command for selected alias')
          dir = exec(used_program + ' '+file_path+file_name, function(err, stdout, stderr) {
            if (err) {
              console.log('Shell Cmd: Error code :' + err);
              console.log('Shell Cmd: ' + stderr);
            }
            console.log('Shell Cmd: ' + stdout);
          });
          dir.on('exit', function (code) {
            console.log('Shell Cmd: exit code : ' + code);
          });
          //console.log('Shell Cmd: started.');
      }else{
        console.log('File '+file_name+' not exist');
      }
    }
}

module.exports = {
    run: run
}
