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

## Make required changes to process-default.json for environment variable support
sed -i "/cwd/c\   \"cwd\" : \"/app\"," /app/process-default.json
sed -i "/NODE_ENV/c\   \"NODE_ENV\" : \"$NODE_ENV\"," /app/process-default.json
sed -i "/HOSTNAME/c\   \"HOSTNAME\" : \"$HOSTNAME\"," /app/process-default.json
sed -i "/USE_COOKIE_HOST/c\   \"USE_COOKIE_HOST\" : $USE_COOKIE_HOST," /app/process-default.json
sed -i "/APP_NAME/c\   \"APP_NAME\" : \"$APP_NAME\"" /app/process-default.json

## Create messages database if it doesn't exist
if [ -f /data/messages.db ]; then
    ln -s "/data/messages.db" ./messages.db
else
    mkdir -p /data && touch /data/messages.db && ln -s "/data/messages.db" ./messages.db
fi

## Create and link default config.json file, if it doesn't exist
if [ -f /data/config.json ]; then
    ln -s "/data/config.json" ./config/config.json
else
    cp ./config/default.json /data/config.json && ln -s "/data/config.json" ./config/config.json
fi

node app.js
