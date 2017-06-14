# PagerMon-Client

Client component of the PagerMon server.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

* [nodejs](https://nodejs.org/)
* [rtl_fm](https://github.com/osmocom/rtl-sdr)
* or [keenard's fork of rtl_fm](https://github.com/keenerd/rtl-sdr)
* [multimon-ng](https://github.com/EliasOenal/multimon-ng)

### Installing

```
cd client
npm install
cp config/default.json config/config.json
```

Edit config/config.json to suit your environment. Identifier should be a small string that will show up in the 'source' column of the messages display.

Check the samples dir for example usage.

## Contributing

All are welcome to contribute.

## Versioning

We use [SemVer](http://semver.org/) for versioning. For the versions available, see the [tags on this repository](https://github.com/davidmckenzie/pagermon/tags). 

## Authors

See the list of [contributors](https://github.com/davidmckenzie/pagermon/contributors) who participated in this project.

## License

This project is licensed under The Unlicense - because fuck licenses. Do what you want with it. :>

## Acknowledgments

* multimon-ng
