#!/bin/sh

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

## Configure environment.

## Make required changes to process-default.json for environment variable support
sed -i "/cwd/c\   \"cwd\" : \"/app\"," /app/process-default.json
sed -i "/error_file/c\   \"error_file\" : \"../data/logs/node-app.stderr.log\"," /app/process-default.json
sed -i "/out_file/c\   \"out_file\" : \"../data/logs/node-app.stdout.log\"," /app/process-default.json
sed -i "/cwd/c\   \"cwd\" : \"/app\"," /app/process-default.json
sed -i "/NODE_ENV/c\   \"NODE_ENV\" : \"$NODE_ENV\"," /app/process-default.json
sed -i "/HOSTNAME/c\   \"HOSTNAME\" : \"$HOSTNAME\"," /app/process-default.json
sed -i "/USE_COOKIE_HOST/c\   \"USE_COOKIE_HOST\" : $USE_COOKIE_HOST," /app/process-default.json
sed -i "/APP_NAME/c\   \"APP_NAME\" : \"$APP_NAME\"" /app/process-default.json

## Create and link default config.json file, if it doesn't exist
rm -rf /app/config/config.json #Shoud never be local config here, so here we'll kill it just incase it's been left over / otherwise linking will fail
if [ -f /data/config.json ]; then
    ln -s /data/config.json /app/config/config.json
else
node > /data/config.json <<EOF
var data = require('/app/config/default.json');

data.database.type = 'mysql';
data.database.server = '$MYSQL_HOST';
data.database.username = '$MYSQL_USER';
data.database.password = '$MYSQL_PASSWORD';
data.database.database = '$MYSQL_DATABASE';

console.log(JSON.stringify(data, null, 4));
EOF
ln -s /data/config.json ./config/config.json
fi

## Create default process.json file for pm2 server
if [ -f /data/process.json ]; then
    ln -s "/data/process.json" ./process.json
else
    cp ./process-default.json /data/process.json && ln -s "/data/process.json" ./process.json
fi

## We probably should wait for MySQL to come up
echo "=== Waiting for MySQL to come up ==="
while ! mysqladmin ping -h $MYSQL_HOST --silent; do
    sleep 1
done
echo "=== MySQL is up =="

#knex migrate:latest

node app.js
#pm2 start process.json --no-daemon
