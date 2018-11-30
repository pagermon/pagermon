var exec = require('child_process').exec;


function run(trigger, scope, data, config, callback) {


    console.log('Exec shell command for selected alias')
    dir = exec('sh '+process.cwd()+'/plugins-scripts/script-'+data.alias_id+'.sh', function(err, stdout, stderr) {
      if (err) {
        console.log('Shell Cmd: Error code :' + err);
        console.log('Shell Cmd: ' + stderr);
      }
      console.log('Shell Cmd: ' + stdout);
    });
    dir.on('exit', function (code) {
      console.log('Shell Cmd: exit code : ' + code);
    });
    console.log('Shell Cmd: started.');


    //callback(data);
}

module.exports = {
    run: run
}
