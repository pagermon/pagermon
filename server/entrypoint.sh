#!/bin/bash

cd /app

if [ -f /data/messages.db ]; then
    ln -s "/data/messages.db" ./messages.db
else
    # create file on first run, use existing file thereafter
    mkdir -p /data && touch /data/messages.db && ln -s "/data/messages.db" ./messages.db
fi

node app.js
