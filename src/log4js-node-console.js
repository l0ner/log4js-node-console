/*

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
*/

const { Console } = require("console");
const Log4JsStream = require('./logStream.js');

/**
 * Strings to replace from category name. The replacement will be executed as the last step of category name generation,
 * and thus source can be parts of the final category name. For example `@modules.fooLibrary.fooFunction` may be
 * replaced with `BarFunction`.
 *
 * @typedef {object} CategoryReplace
 * @property {string} source - What to replace in category name
 * @property {string} replacement - What to insert instead in the category name.
 */

/**
 * Log4jsConsole options
 *
 * @typedef {object} Log4jsConsoleOptions
 * @property {boolean} watchConfig - Watch the configuration file for changes and reload log4js-node when it changes.
 * @property {string} assertLevel - To which log level `assert()` should output it's messages.
 * @property {string} countLevel - To which log level `count()` should output it's messages.
 * @property {string} dirLevel - To which log level `dir()` and `dirxml()` should output it's messages.
 * @property {string} tableLevel - To which log level `table()` should output it's messages.
 * @property {string} timeLevel - To which log level `timeEdn()` should output it's messages.
 * @property {string} modulePrefix - Prefix to use for files coming from node_modules.
 * @property {boolean} includeFunctionInCategory - Wether or not to include function and class names in automatically generated category name.
 * @property {string[]} ignoreCategoryElements - List of strings to ignore when constructing category name.
 * @property {CategoryReplace[]} replaceElements - List of strings to replace with something else in category name.
 */

/**
 * Compatibility layer between log4js library and Node.js `console`.
 *
 * This will allow you to replace the default Node.js `console` with log4js, and keep logging using `console` and
 * directing all the output to the log4js. Logging functions will automatically determine che log4js category based on
 * what has called. The automatic log4js category will be `filename[.Class][.function()]`.
 *
 * @example
 * console = new log4jsConsole('loggerConfiguration.json');
 * console.log('Hello World'); // will be forwarded to log4js
 */
class Log4jsConsole extends Console {
	/**
	 *
	 * @param {string | object} loggerConfig - Configuration for log4js.
	 * @param {Log4jsConsoleOptions} options - Options.
	 */
	constructor(loggerConfig, options = undefined) {
		const stream = new Log4JsStream(loggerConfig, options);

		super(stream, stream)
	}

	// we need to rebind these functions, as node by default aliases these to
	// log, warn and debug.
	trace(message, ...args) { super.trace(message, ...args); }
	debug(data, ...args) { super.debug(data, ...args); }
	info(data, ...args) { super.info(data, ...args); }
	warn(data, ...args) { super.warn(data, ...args); }
	error(data, ...args) { super.error(data, ...args); }
	log = this.info;
}

module.exports = Log4jsConsole;
