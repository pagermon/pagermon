/*

The `run` function is called on each event, only when the event and scope settings match in the associated JSON file

The `run` function receives 4 variables:

* `event` is the event which triggered the plugin (at the moment this only triggers on 'message')
* `scope` will be either `before` or `after` - `before` plugins can be used to block processing of messages
* `data` will contain the contents of the event
* `config` contains the settings configured in the UI for this plugin

*/

function run(event, scope, data, config) {

}

module.exports = {
    run: run
}