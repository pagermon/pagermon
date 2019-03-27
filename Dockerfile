FROM node:9.4.0-alpine

RUN apk add --no-cache sqlite

ENV NODE_ENV production

ADD ./server /app

WORKDIR /app

RUN npm install

VOLUME ["/data"]

EXPOSE 3000

CMD ["sh","/app/entrypoint.sh"]
