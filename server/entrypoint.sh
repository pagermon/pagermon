#!/bin/bash

cd /app

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
