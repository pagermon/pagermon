#!/bin/bash

cd /app

if [ -z "$NODE_ENV" ]; then
  echo "NODE_ENV was not set -- Defaulting to production"
  NODE_ENV=production
fi


if [ -z "$HOSTNAME" ]; then
  echo "HOSTNAME was not set -- Defaulting to localhost"
  HOSTNAME=localhost
fi

if [ -z "$USE_COOKIE_HOST" ]; then
  echo "USE_COOKIE_HOST was not set -- Defaulting to false"
  USE_COOKIE_HOST=FALSE
fi

if [ -z "$APP_NAME" ]; then
  echo "APP_NAME was not set -- Defaulting to pagermon"
  APP_NAME=pagermon
fi

rm -rf /app/process-default.json

cat <<EOT > /app/process-default.json
{
  "name"             : "pagermon",
  "cwd"              : "/app",
  "script"           : "app.js",
  "node_args"        : ["--harmony"],
  "error_file"       : "logs/node-app.stderr.log",
  "out_file"         : "logs/node-app.stdout.log",
  "pid_file"         : "pids/node-geo-api.pid",
  "instances"        : 1, //or 0 => 'max'
  "min_uptime"       : "200s", // 200 seconds, defaults to 1000
  "max_restarts"     : 10, // defaults to 15
  "max_memory_restart": "100M", // 1 megabytes, e.g.: "2G", "10M", "100K", 1024 the default unit is byte.
  "cron_restart"     : "1 0 * * *",
  "watch"            : false,
  "ignore_watch"      : ["[\\/\\\\]\\./", "node_modules", "config", "logs"],
  "merge_logs"       : true,
  "exec_interpreter" : "node",
  "autorestart"      : true, // enable/disable automatic restart when an app crashes or exits
  "vizion"           : false, // enable/disable vizion features (versioning control)
  "env": {
    "NODE_ENV": "$NODE_ENV",
    "HOSTNAME": "$HOSTNAME",
    "USE_COOKIE_HOST": $USE_COOKIE_HOST,
    "APP_NAME": "$APP_NAME"
  }
}
EOT

if [ -f /data/messages.db ]; then
    ln -s "/data/messages.db" ./messages.db
else
    # create file on first run, use existing file thereafter
    mkdir -p /data && touch /data/messages.db && ln -s "/data/messages.db" ./messages.db
fi
if [ -f /data/config.json ]; then
    ln -s "/data/config.json" ./config/config.json
else
    cp ./config/default.json /data/config.json && ln -s "/data/config.json" ./config/config.json
fi

node app.js
