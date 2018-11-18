- All plugins that require per-alias configuration settings should have a boolean variable named 'enable' to allow setting/unsetting on individual aliases


{
    "name": "Template", // must map to file name
    "description": "Example plugin for developers", // shown in UI when enabling/disabling
    "event": "message", // on what event should this plugin run, currently only "message"
    "scope": "after", // should this run before or after the event
    "config": [ // array of config options exposed in settings
        {
            "name": "templateSetting", // variable name for the setting
            "label": "Example Setting", // human readable label
            "description": "This is an example setting on the template plugin", // help text in UI
            "type": "text", // input type - html type, e.g. text, number
        }
    ],
    "aliasConfig": [ // array of config options shown on aliases
        {
            "name": "enable", // variable name for the setting
            "label": "Enable Example Plugin", // human readable label
            "description": "This is an example checkbox on the template plugin", // help text in UI
            "type": "checkbox", // input type - html type, e.g. text, number
        }
    ]
}