# Plugins

PagerMon plugins are modular addons for executing custom workflows during message processing. They can be enabled/disabled in the settings page of the admin interface, or via the `config.json` file. Plugins can have per-alias settings, allowing them to be enabled/disabled at an individual capcode level.

## Developing plugins

To add a new plugin, you will need a .json and .js file. Ideally these two files will have the same name and use the same 'first character uppercase' convention as other plugins, for consistency. 

### Plugin configuration file

[Template.json](Template.json)

```javascript
{
  "name": "Template",       // must map to file name
  "description": "Example plugin for developers", // shown in UI when enabling/disabling
  "disable": true,          // global disable - if true then cannot be enabled in UI. Plugins that may be a security risk should ship with this set to true
  "event": "message",       // on what event should this plugin run, currently only "message"
  "scope": "after",         // should this run before or after the event - before will block processing, but allow you to manipulate a message before it is committed to the database
  "config": [               // array of global config options exposed in settings page
    {
      "name": "templateSetting",      // variable name for the setting
      "label": "Example Setting",     // human readable label
      "description": "This is an example setting on the template plugin",     // help text in UI
      "type": "text",       // input type - html type, e.g. text, number
      "required": true      // include to make the field required - this only adds the required flag in the UI, it doesn't add any logic in the actual plugin handling
    },
    {                       // you can add as many config options as required, provided they all have unique variable names
      "name": "templateCheckbox",
      "label": "Example Checkbox",
      "description": "This is an example checkbox on the template plugin",
      "type": "checkbox"    // the input type can be any valid HTML input type, though more complex types may require changes to settings.html and aliasDetails.html
    }
  ],
  "aliasConfig": [          // array of options for per-alias configuration
    {
      "name": "enable",     // these are pretty much identical to the global config options, they're just stored at the alias level
      "label": "Enable Example Plugin",
      "description": "Enable the template plugin on this alias",
      "type": "checkbox"
    },
    {
      "name": "priority",
      "label": "Priority",
      "description": "Example select box",
      "type": "select",     // the select input type requires an array of options
      "options": [          // array of objects, must have 'value' and 'text' keys
        {"value": "-2", "text": "Lowest Priority"}, // value is the value that will be referenced in your plugin code
        {"value": "-1", "text": "Low Priority"},    // text is the pretty label for the option
        {"value": "0", "text": "Normal Priority"},
        {"value": "1", "text": "High Priority"},
        {"value": "2", "text": "Emergency Priority"}
      ],
      "required": true
    },
  ]
}
```

**Notes:**
* Comments are not supported in the JSON files, they are shown above only for documentation purposes
* Checkbox and select are the only special `type` for config items - checkbox (probably) shouldn't have the `required` flag, and select needs options
* All plugins that require per-alias configuration settings *should* have a boolean variable named 'enable' to allow setting/unsetting on individual aliases. Nothing will explode if you don't, but you really should.

### Plugin design

[Template.js](Template.js)

Plugins are called by the `run` function on each event, only when the event and scope settings match in the associated JSON file, and only when the plugin is enabled in the global config.

The `run` function receives 4 variables:

* `event` is a string containing event which triggered the plugin (currently only 'message')
* `scope` is a string containing either `before` or `after`
* `data` is an object containing the contents of the event
* `config` is an object containing the global settings configured in the UI for this plugin

```javascript
function run(event, scope, data, config) {

}

module.exports = {
    run: run
}
```

The `data` object is structured thusly on `after` events:

```javascript
{ id: 27862,
  address: '1000000',
  message: 'Tue 20 Nov 2018 10:50:57 AEDT Test message, disregard',
  source: 'TEST',
  timestamp: 1542671458,
  alias_id: 148,
  alias: 'TEST Alias 2',
  agency: 'TEST',
  icon: 'question',
  color: 'black',
  ignore: 0,
  aliasMatch: 148,
  pluginconf: {
    Discord: { enable: false, webhook: '' },
    Pushover: {
      enable: true,
      priority: {value: "0", text: "Normal Priority"},
      group: '4534312',
      sound: {value: "magic", text: "Magic"}
    },
    SMTP: { enable: true, mailto: 'a@a.com' },
    Telegram: { enable: true, chat: '1234' },
    Twitter: { enable: false, hashtag: '' }
  }
}
```

* `data.pluginconf` contains the per-alias configuration settings for all plugins - the plugin name is the key for its object, so you can pull down `data.pluginconf.Template` for the template plugin's settings.
* Your plugin's logic should expect that `data.pluginconf` may return `undefined` or an empty object
* Note that the `select` option types are stored as an object - in this example, to access the Pushover priority you would need to read `data.pluginconf.Pushover.priority.value`

On a message without a matching alias, the `data` object will have null for most fields, and an empty object for `pluginconf`:

```javascript
{ id: 27864,
  address: '8120000',
  message: 'Tue 20 Nov 2018 11:11:29 AEDT Test message, disregard',
  source: 'TEST',
  timestamp: 1542672689,
  alias_id: null,
  alias: null,
  agency: null,
  icon: null,
  color: null,
  ignore: null,
  aliasMatch: null,
  pluginconf: {} }
```

On a `before` plugin, the `data` object has not yet been through alias matching, so contains even less data. It is not possible to configure per-alias settings for `before` plugins:

```javascript
{ address: '8120000',
  message: 'Tue 20 Nov 2018 11:11:29 AEDT Test message, disregard',
  datetime: '1542672689',
  source: 'TEST' }
```

The `config` object contains the global config for this particular plugin, e.g.:

```javascript
{ enable: true, templateSetting: 'testsetting', templateCheckbox: true }
```