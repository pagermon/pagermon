# [PagerMon](https://hrng.io/)

PagerMon is an API driven client/server framework for parsing and displaying pager messages from multimon-ng.

It is built around POCSAG messages, but should easily support other message types as required.

The UI is built around a Node/Express/Angular/Bootstrap stack, while the client scripts are Node scripts that receive piped input.

## Features

* Capcode aliasing with colors and [FontAwesome](https://fontawesome.io/icons/) icons
* API driven extensible architecture
* Single user, multiple API keys
* SQLite database backing
* Configurable via UI
* Pagination and searching
* Filtering by capcode or agency
* Duplicate message filtering
* Keyword highlighting
* WebSockets support - messages are delivered to clients in near realtime
* Pretty HTML5
* Native browner notifications
* Push notifications
    * [Pushover](https://pushover.net/) Integration - near realtime muti-device notification service
    * [Telegram](https://telegram.org/) Integration - near realtime cloud based multi-device messaging
    * [Discord](https://discordapp.com/) Integration - near realtime cloud based messaging service
    * [Twitter](www.twitter.com) Integration 
    * Email Support for conventional SMTP email notifications 
* May or may not contain cute puppies

### Planned Features

* Multi-user support
* Other database support (MongoDB and DynamoDB planned)
* Horizontal scaling
* Enhanced message filtering
* Bootstrap 4 + Angular 2 support
* Enhanced alias control
* Graphing
* Non-sucky documentation

### Screenshots

![main view](http://i.imgur.com/QWKoJjb.jpeg)

![desktop view](http://i.imgur.com/Zik74Dl.jpeg)

![alias edit](http://i.imgur.com/gus8QTe.jpeg)

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

* [nodejs](https://nodejs.org/)
* sqlite3
* Probably some other stuff

#### Recommended

* [nvm](https://github.com/creationix/nvm#installation)
* nginx or some kind of reverse proxy for SSL offloading

## Running the server

### Local setup

1) Copy server/process-default.json to server/process.json and modify according to your environment
2) Launch the app from the Terminal:

```
    $ sudo apt-get install npm sqlite3
    $ npm install npm@latest -g
    $ npm install pm2 -g
    $ cd server
    $ npm install
    $ export NODE_ENV=production
    $ pm2 start process.json
```
3) To start on boot, let pm2 handle it:
```
    $ sudo pm2 startup
    $ pm2 save
```
4) You probably want to rotate logs, too:
```
    $ pm2 install pm2-logrotate
    $ sudo pm2 logrotate -u user
```
5) Now login via the website, default port is 3000, default credentials are 'admin' / 'changeme'
6) Head to /admin, change your password, and generate some API keys
6) Grab your API keys and drop them in the PagerMon client, then you're good to go!

### Docker

1) Build the container:
```
    $ docker build -f docker/Dockerfile -t pagermon .
```

2) Run the container

​	In __foreground__:
```
    $ docker run --name pagermon -p 3000:3000 -v $(pwd)/data:/data --rm -it pagermon
```

OR

​	As __daemon__ (`-d`) with autorun (`--restart always` = startup ):
```
    $ docker run --restart --name pagermon -d -p 3000:3000 -v $(pwd)/data:/data pagermon
```
__NOTE:__
   - The database will be located relativ to your current working directory under `./data/messages.db` (by `-v $(pwd)/data:/data`)
   - The local port `3000` will be forwarded to the docker container to port `3000` (by `-p 3000:3000`)
   - In case you would like to follow the logfile, run `docker logs -f pagermon` (by `--name pagermon `)
   - To shutdown and remove the container, run `docker rm -fv pagermon`

3) Follow __Step 5__ from __Running the server____

## Contributing

All are welcome to contribute.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/davidmckenzie/pagermon/tags).

## Authors

See the list of [contributors](https://github.com/davidmckenzie/pagermon/contributors) who participated in this project.

## License

This project is licensed under The Unlicense - because fuck licenses. Do what you want with it. :>

## Acknowledgments

* [multimon-ng](https://github.com/EliasOenal/multimon-ng)
