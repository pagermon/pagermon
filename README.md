# [PagerMon](https://hrng.io/)
![Discord](https://img.shields.io/discord/533900375066017812.svg?style=plastic)
![GitHub issues](https://img.shields.io/github/issues-raw/pagermon/pagermon.svg?style=plastic)
![GitHub pull requests](https://img.shields.io/github/issues-pr/pagermon/pagermon.svg?style=plastic)
![GitHub](https://img.shields.io/github/license/pagermon/pagermon.svg?style=plastic)
![GitHub stars](https://img.shields.io/github/stars/pagermon/pagermon.svg?style=plastic)
![GitHub forks](https://img.shields.io/github/forks/pagermon/pagermon.svg?style=plastic)
![GitHub tag (latest SemVer)](https://img.shields.io/github/tag/pagermon/pagermon.svg?label=release&style=plastic)
![GitHub commit activity](https://img.shields.io/github/commit-activity/m/pagermon/pagermon.svg?style=plastic)
![GitHub contributors](https://img.shields.io/github/contributors/pagermon/pagermon.svg?style=plastic)
![GitHub Workflow Status (branch)](https://img.shields.io/github/actions/workflow/status/pagermon/pagermon/server.js.yml?branch=master&label=Build%20master)
![GitHub Workflow Status (branch)](https://img.shields.io/github/actions/workflow/status/pagermon/pagermon/server.js.yml?branch=develop&label=Build%20develop)

PagerMon is an API driven client/server framework for parsing and displaying pager messages from multimon-ng.

It is built around POCSAG messages, but should easily support other message types as required.

The UI is built around a Node/Express/Angular/Bootstrap stack, while the client scripts are Node scripts that receive piped input.

## Features

* Capcode aliasing with colors and [FontAwesome](https://fontawesome.io/icons/) icons
* API driven extensible architecture
* Multi-user support
* SQLite or MySQL database backing
* Configurable via UI
* Pagination and searching
* Filtering by capcode or agency
* Duplicate message filtering
* Native POCSAG / FLEX / EAS Client Support
* Keyword highlighting
* WebSockets support - messages are delivered to clients in near realtime
* Pretty HTML5
* Native browser notifications
* Plugin Support - Current Plugins:
    * [Pushover](https://pushover.net/) near realtime muti-device notification service
    * [Prowl](https://prowlapp.com) near realtime iOS notification service with Apple Watch support
    * [Telegram](https://telegram.org/) near realtime cloud based multi-device messaging
    * [Discord](https://discordapp.com/) near realtime cloud based messaging service
    * [Gotify](https://gotify.net/) Self-Hosted messaging service
    * [Twitter](https://www.twitter.com/)
    * [Microsoft Teams](https://products.office.com/en-us/microsoft-teams/group-chat-software) Team colaboration platform
    * [Slack](https://slack.com/) Team colabortation platform
    * SMTP Email Support for conventional SMTP email notifications 
    * Regex Filters - Filter incoming messages via regex
    * Regex Replace - Modify incoming messages via regex
    * Message Repeat - Repeat incoming messages to another pagermon server
* May or may not contain cute puppies

### Planned Features

* Horizontal scaling
* Enhanced message filtering
* Bootstrap 4 + Angular 2 support
* Enhanced alias control
* Graphing

### Screenshots

![main view](http://i.imgur.com/QWKoJjb.jpeg)

![desktop view](http://i.imgur.com/Zik74Dl.jpeg)

![alias edit](http://i.imgur.com/gus8QTe.jpeg)

## Getting Started

### Installing and Running the Server

#### Installation
Installation guide is available on the wiki - [Server Installation](https://github.com/pagermon/pagermon/wiki/Server-Installation)

#### Running the Server
Installation guide is available on the wiki - [Running Pagermon Server](https://github.com/pagermon/pagermon/wiki/Running-Pagermon-Server)

A production ready setup guide is available here, but several steps are out of date
https://github.com/pagermon/pagermon/wiki/Tutorial---Production-Ready-Ubuntu,-PM2,-Nginx-Reverse-Proxy,-Let's-Encrypt-SSL,-Pagermon-server

### Docker

Docker Guide is available on the wiki at [Docker Guide](https://github.com/pagermon/pagermon/wiki/Docker-Guide)

### Installing and Running the client

#### Installation
Installation guide is available on the wiki - [Client Installation](https://github.com/pagermon/pagermon/wiki/Client-Installation)

#### Running the CLient
Installation guide is available on the wiki - [Running Pagermon Client](https://github.com/pagermon/pagermon/wiki/Running-Pagermon-Client)

## PagermonPi - Raspberry Pi Image
Check out our Raspberry Pi Image for Pi3 & Pi4 which has Pagermon pre-loaded on it.

Check out the following links:

[Releases](https://github.com/pagermon/pagermon/releases) for the latest version
[Wiki](https://github.com/pagermon/pagermon/wiki/PagermonPi-Image-For-Raspberry-Pi) for PagermonPi support

## Support

General PagerMon support can be requested in the #support channel of the PagerMon discord server.

[Click Here](https://discord.gg/3VK7gSD) to join

Bugs and Feature requests can be logged via the GitHub issues page. 

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
* [jSAME](https://github.com/MaxwellDPS/jsame)
