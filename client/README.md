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

Some environments send additional information via the "Function Code" in the pager message. Change `sendFunctionCode` to `true` to send this appended to the end of the address of each message. E.g. `POCSAG512: Address: 1000022  Function: 3  Alpha: test` would land on the server with an address of `10000223`.

Some environments prepend pager messages with a timestamp - by default reader.js will trim these from the message and use them as the timestamp for the message. If you do not wish for this to happen, set `useTimestamp` to `false`. Only a limited type of timestamps are currently supported - if you wish to add a time format, submit an issue with some example messages.

Check the samples dir for example usage.

### Import.js

The `import.js` script can be used to import capcode aliases from PDW filters.ini or a generic CSV file.

Usage: 
    `cat filters.ini | node import.js --pdw`
    `cat aliases.csv | node import.js`

CSV must have columns in any order of the following: 
    `id,address,alias,agency,color,icon,ignore,pluginconf`

Only address, alias, and agency are mandatory. The file should have column headers. E.g.:

```
alias,address,something,color,agency,junk
Warringah - UNID,1370%,words,darkgreen,RFS,description or something that isnt imported
```


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
