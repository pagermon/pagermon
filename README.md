# [PagerMon](https://hrng.io/)
![Discord](https://img.shields.io/discord/533900375066017812.svg?style=plastic)
![GitHub issues](https://img.shields.io/github/issues-raw/pagermon/pagermon-server.svg?style=plastic)
![GitHub pull requests](https://img.shields.io/github/issues-pr/pagermon/pagermon-server.svg?style=plastic)
![GitHub](https://img.shields.io/github/license/pagermon/pagermon-server.svg?style=plastic)
![GitHub stars](https://img.shields.io/github/stars/pagermon/pagermon-server.svg?style=plastic)
![GitHub forks](https://img.shields.io/github/forks/pagermon/pagermon-server.svg?style=plastic)
![GitHub tag (latest SemVer)](https://img.shields.io/github/tag/pagermon/pagermon-server.svg?label=release&style=plastic)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/pagermon/pagermon-server.svg?style=plastic)
![GitHub contributors](https://img.shields.io/github/contributors/pagermon/pagermon-server.svg?style=plastic)

# This Project has changed. 
## Pagermon has changed the layout of the repositories to make it easier for integrations with the project. 
## The client and server now have seperate repositories, which can be pulled through the submodules in this master repository, or individually:
### The server can be found here https://github.com/pagermon/pagermon-server
### The client can be found here https://github.com/pagermon/pagermon-client

### To pull the submodules from the master repository:
```
git submodule update --init --recursive
```
### To update the submodules on subsequent pulls:
```
git pull --recurse-submodules
```


PagerMon is an API driven client/server framework for parsing and displaying pager messages from multimon-ng.

It is built around POCSAG messages, but should easily support other message types as required.

The UI is built around a Node/Express/Angular/Bootstrap stack, while the client scripts are Node scripts that receive piped input.

## Features

* Capcode aliasing with colors and [FontAwesome](https://fontawesome.io/icons/) icons
* API driven extensible architecture
* Single user, multiple API keys
* SQLite or MySQL database backing
* Configurable via UI
* Pagination and searching
* Filtering by capcode or agency
* Duplicate message filtering
* Keyword highlighting
* WebSockets support - messages are delivered to clients in near realtime
* Pretty HTML5
* Native browner notifications
* Plugin Support - Current Plugins:
    * [Pushover](https://pushover.net/) near realtime muti-device notification service
    * [Prowl](https://prowlapp.com) near realtime iOS notification service with Apple Watch support
    * [Telegram](https://telegram.org/) near realtime cloud based multi-device messaging
    * [Discord](https://discordapp.com/) near realtime cloud based messaging service
    * [Gotify](https://gotify.net/) Self-Hosted messaging service
    * [Twitter](www.twitter.com)
    * [Microsoft Teams](https://products.office.com/en-us/microsoft-teams/group-chat-software) Team colaboration platform
    * [Slack](https://slack.com/) Team colabortation platform
    * SMTP Email Support for conventional SMTP email notifications 
    * Regex Filters - Filter incoming messages via regex
    * Regex Replace - Modify incoming messages via regex
    * Message Repeat - Repeat incoming messages to another pagermon server
* May or may not contain cute puppies

### Planned Features

* Multi-user support
* Postgres + MariaDB Support
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


## Contributing

All are welcome to contribute. Contributors should submit a pull request with the requested changes.

CHANGELOG.md is to be updated on each pull request.

If a pull request is the first pull request since a [release](https://github.com/pagermon/pagermon/releases), then the version number should be bumped in `CHANGELOG.md`, `server/app.js`, and `server/package.json`.

If a database schema change is required, this must be done using KnexJS Migration files. **Insert Instructions for this here**

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/pagermon/pagermon/tags).

## Authors

See the list of [contributors](https://github.com/pagermon/pagermon/contributors) who participated in this project.

## License

This project is licensed under The Unlicense - because fuck licenses. Do what you want with it. :>

## Acknowledgments

* [multimon-ng](https://github.com/EliasOenal/multimon-ng)
