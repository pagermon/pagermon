# 0.3.0 - Unreleased
**Upgrade Notes:** 
This is a major release with a complete rewrite of all database queries. 

This may result in unintended or different behaviour to previous versions, in testing this has mainly been around searching. 

Upgrades are only possible from version **0.2.3**, if you are on a lower version than this, you must first upgrade to 0.2.3 then upgrade to 0.3.0 

**PLEASE ENSURE YOU TAKE A FULL BACKUP BEFORE PERFORMING THE UPGRADE** 

* Compeletly rebuilt database driver to use the [KnexJS](https://knexjs.org/) query builder. #174
    * **Upgrades of existing SQLite databases must be performed from v0.2.3**
    * Adds support for **MySQL**.
    * MariaDB should also work however this has not been tested. 
    * Conversion of existing databases is up to the user. We recommend starting a new database if you would like to switch to MySQL.
    * This is super BETA, it has been tested as best as possible but bugs WILL exist. Please report via github bugtracker. 
    * Database upgrades are now handled by migration files to make upgrades easier in the future. 
* Convince Winston to follow the laws of Physics #251
* More complete docker support #243, #249
* Fix display issues on large resolution mobile devices #241
* Update old repository URL in package.json and index.ejs #240 #252
* Add ability to select the icon size on the homepage #239
* Fix 404 error when trailing slash added to hostname in client config #223
* Patch Total.js CVE #232
* Message Repeat Plugin #222
* Parse timestamps in messages #72
* Compatibility with multimon timestamp option #57
* Fix URL state not updating properly on Firefox #229

# 0.2.3 - 2019-02-05

* Fix cookies expiring on browser close #206
* Fix refresh aliases button not appearing #194
* Remove solid white background from Icon images #216
* Fix capcode route not allowing API authentication #218

# 0.2.2 - 2019-01-15

* Fix security vulnerability - /api/capcodes route unsecured and leaking confidential info when hideCapcode and secMode both disabled

# 0.2.1 - 2019-01-13

* Added CHANGELOG.md (hey, that's this thing!) #192
* Stopped naughty Winston from modifying objects #152
* Added missing dependencies #153
* Updated README.md #163
* Added regex replacement plugin #172
* Client script now properly handles "KFC" flags #173
* Client script now retries sending messages 10 times before it gives up and goes back to napping #173
* Added additional index for... indexing things #181
* Update documentation to point to correct FA icons #182
* Added PDW to PagerMon python client script #183
* Added User-Agent to Powershell client script #184
* Fixed bug on Pushover plugin when configuration partially missing #186
* Made cookie hostname configuration optional, to make bad stuff less bad #188
* Added optional flag to include function codes with address on POCSAG messages #191


# 0.2.0 - 2018-12-06

* All notification engines (Telegram, Discord, etc.) have been moved to independent plugins that can be enabled/disabled globally and per-alias
* Plugins exist for Discord, Microsoft Teams, Pushover, SMTP, Slack, Telegram, Twitter #142
* Added plugin to filter out messages before processing
* Plugin configuration is now stored in one big char column that holds JSON
* Migrated to Winston logging so that the loglevel option actually works
* Logging for HTTP vs all other things are now segregated in files under the log directory
* Messages now sort by timestamp instead of id #148 
* Minimum address length bumped down to 2 for compatibility with POCSAG1200 #145 
* Improvements to security mode make it more secure and stuff #118 / #136
* History state pushed to browser on page or search #120
* Cookies now work on www and non-www domains when set properly in ENV vars #121
* Clicking on things now makes pretty popovers #123
* Duplicate message filtering can now be based on time, instead of last x messages #126
* Fragmented FLEX messages are now (almost) handled properly #110
* Started to actually reference PRs in change notes.

# 0.1.8 - 2018-08-20

* Search capability has been refactored to depend on the Full Text Search (FTS3) module of SQLite. Database structure should be automagically updated on first start, however if you encounter any issues please see #102.
* Dependencies updated to fix a few security vulnerabilities.

*(Note: Despite the introduction of searching capabilities, the release notes for 0.1.7 are still missing. If found, please escort to your nearest developer.)*

# 0.1.6 - 2018-08-20

* Adds the ability for pushover notifications to be sent to a different destination on a per-alias basis
* Make the 'edit alias' links on homepage open in new window
* Add option to hide capcodes and source column from main UI unless admin
* Fix for multimon's curious encoding of square brackets
* Client console output uses the padded address for prettier text alignment
* Fix for an undefined body in response under certain conditions

# 0.1.5 - 2018-04-24

* Adds email support

# 0.1.4 - 2017-08-15

* Adds pushover notifications

# 0.1.3 - 2017-06-30

This release contains a huge number of changes to the database structure, as well as a complete refactor of huge chunks of the API. Please ensure instructions are read and understood before upgrading:

### [Upgrade Instructions](https://github.com/davidmckenzie/pagermon/wiki/0.1.3-Upgrade-Instructions)

#### Change Notes
* Massive performance optimisation
* Change to stricter capcode alias matching
* Client updated to send new capcode format, and new message format
* Many minor tweaks and bugfixes
* [Wiki](https://github.com/davidmckenzie/pagermon/wiki) has been created (it's really empty at the moment).

# 0.1.2 - 2017-06-24

This release mostly contains bug fixes and minor UI tweaks.
* Updated documentation
* Cdnjs and unpkg includes now explicitly specify HTTPS
* Fixed bug with async loading of includes
* Added FLEX support and expanded POCSAG to include other bitrates
* Capcodes can now be longer than 7 chars
* Fixed bug with special chars in messages, improved sanitisation
* Prevented inappropriate database closing
* Refactored the message pushing system:
  * Incoming messages obey filters
  * Ignored messages are now actually ignored
  * Socket emit sends full message, instead of instructing clients to get it themselves (reduces load on DB and number of HTTP calls)
* Browser now scrolls to top when clicking on a filter
* Banner alerts now fade after 3 seconds
* Some minor code cleanup and cute little puppies

# 0.1.1 - 2017-06-14

* Added a regex aliasing feature - allows you to set labels for specific search strings, which are displayed in a tooltip when hovering over the search match.
* Added a 'source' column to the messages table - allows you to visually differentiate between messages that come from different systems or locations

# 0.1.0 - 2017-06-12

✨ Initial release
