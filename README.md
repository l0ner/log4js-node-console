log4js-node-console
===================

Compatibility layer between log4js library and Node.js `console` .

This will allow you to replace the default Node.js `console` with log4js-node, and keep logging using `console` while
keeping all of the flexibility jog4js-node provides.

Logging functions will automatically determine che log4js category based on what has called them. The automatic
log4js-node category format is: `filename[.Class][.function()]`, with `/` in paths replaced by `.`.

For node modules that use `console` for logging, the name will be
`node_modules.<module_name>.<module_file>[.Class][.function()]`,
with all path elements between the main directory containing the module and the filename in which logging occurs
stripped for brevity.

## Example usage

File `loggerConfiguration.json` :

```json
{
	"appenders": {
		"console": {
			"type": "console",
			"layout": {"type": "pattern", "pattern": "%p [%c] - %m"}
		}
	},
	"categories": {
		"default": {
			"appenders": ["console", "rollingFile"],
			"level": "trace",
			"enableCallStack": true
		}
	}
}
```

File `index.js`

```javascript
const log4jsConsole = require('log4js-node-console');

console = new log4jsConsole('loggerConfiguration.json');

console.log('Hello World');
console.error('This is Error message');
console.warn('This is Warn message');
console.info('This is Info message')
console.debug('This is Debug message');
console.trace('This is Trace message');
foo();

function foo()
{
    console.info('foo() called')
}
```

Will output (depending on your config):

```log
INFO [index] - Hello World
ERROR [index] - This is Error message
WARN [index] -This is Warn message
INFO [index] - This is Info message
DEBUG [index] - This is Debug message
TRACE [index] - This is Trace message
TRACE [index.foo()] - foo() called
```

## Dependencies

- log4js
- app-root-dir: for stripping the location of file that is logging during automatic category name determination
- node-watch (optional): used for monitoring log4js configuration file and automatically reloading log4js configuration when it changes.

## API

The API is 100% same as the one of Node.js [`console`][2] with exception of the constructor.

### `Log4jsConsole(config, options)`

Will construct a new instance of `log4jsConsole` compatibility layer.

Parameters:

Parameter | Type                 | Description
----------|----------------------|-------------------------------------------------------------------------------------------
`config`  | `string` or `object` | Configuration to be passed to `log4js` . See [log4js documentation][1] for details
`options` | `object`             | Options for `log4js-node-console`.  See [below](#log4js-node-console-options) for details.

### Log4js-node-console options

You can pass optional object to `Log4jsConsole` constructor specifying some optional configuration options:

Option                    | Type      | Default | Description
--------------------------|-----------|---------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
watchConfig               | `boolean` | `false` | If optional dependency `node-watch` is installed, and `config` passed to `log4js-node` is a string containing path to the log4js-node configuration, watch the configuration file for changes and reload log4js-node when configuration changes. This will allow you to change logging configuration on the fly.
assertLevel               | `string`  | `warn`  | To which log level `assert()` should output it's messages.
countLevel                | `string`  | `debug` | To which log level `count()` should output it's messages.
dirLevel                  | `string`  | `debug` | To which log level `dir()` and `dirxml()` should output it's messages.
tableLevel                | `string`  | `info`  | To which log level `table()` should output. it's messages
printTrace                | `boolean` | `false` | Print stack trace when using `trace()`.
stackTraceLimit           | `number`  | `10`    | How many lines of the stack `trace()` function should print.
includeFunctionInCategory | `boolean` | `true`  | Wether or not to include function and class names in automatically generated category name

[1]: https://log4js-node.github.io/log4js-node/
[2]: https://nodejs.org/docs/latest-v8.x/api/console.html

## License

GNU GPL v3 or later

Copyright (c) 2023 Pawel Soltys

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program. If not, see <http://www.gnu.org/licenses/>.
