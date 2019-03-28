FROM node:11.11.0-alpine

ADD . /app
WORKDIR /app

RUN apk add --no-cache sqlite && apk add --no-cache mysql-client
RUN npm install pm2@latest -g && npm install knex -g  && npm install sqlite3 && npm install 

VOLUME ["/data"]

EXPOSE 3000

CMD ["sh","/app/entrypoint.sh"]
