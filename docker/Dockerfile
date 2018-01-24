FROM node:9.4.0-alpine

RUN apk add --no-cache sqlite

ENV NODE_ENV production

ADD ./server /app
WORKDIR /app

RUN npm install

RUN mkdir -p /data && touch /data/messages.db && ln -s "/data/messages.db" ./messages.db
VOLUME ["/data"]

EXPOSE 3000

CMD ["node","app.js"]