FROM node:9.4.0-alpine

RUN apk add --no-cache sqlite

ADD . /app

WORKDIR /app

RUN npm install pm2 -g && npm install

VOLUME ["/data"]

EXPOSE 3000

CMD ["sh","/app/entrypoint.sh"]
