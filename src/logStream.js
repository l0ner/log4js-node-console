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

const { Writable } = require("stream");
const AppRootDir = require("app-root-dir");
const log4js = require('log4js');
const path = require('path')

let watch = null;
// check if the optional node-watch has been installed nad ignore error
try { watch = require('node-watch'); }
catch (e) { } // eslint-disable-line no-empty

const appRootDir = AppRootDir.get();

/**
 * Destination for Console that will write to the log4js.
 */
class Log4JsStream extends Writable {
	#defaultConsole;
	#stackTraceLimit = 15;

	#ignoreCategoryElements = ['', '<anonymous>', 'Object', 'Timeout', '_onTimeout'];
	#replaceCategoryElements = [];
	#includeFunctionInCategory = true;
	#modulePrefix = "@modules";

	#addLevels = {
		assert: "warn",
		count: "debug",
		dir: "debug",
		table: "info",
		timeEnd: "info"
	}

	constructor(config, options, streamOptions) {
		super(streamOptions);

		this.#defaultConsole = console;

		log4js.configure(config);
		Error.stackTraceLimit = this.#stackTraceLimit; // Because otherwise we will break things.

		if (options?.watchConfig && watch && Object.prototype.toString.call(config) === "[object String]")
				watch(config, this.#reloadConfig);

		if (options?.assertLevel)
			this.#addLevels["assert"] = options.assertLevel.toLowerCase();

		if (options?.countLevel)
			this.#addLevels["count"] = options.countLevel.toLowerCase();

		if (options?.dirLevel)
			this.#addLevels["dir"] = options.dirLevel.toLowerCase();

		if (options?.tableLevel)
			this.#addLevels["table"] = options.dirLevel.toLowerCase();

		if (options?.timeLevel)
			this.#addLevels["timeEnd"] = options.timeLevel.toLowerCase();

		if (options?.modulePrefix)
			this.#modulePrefix = options.modulePrefix;

		if (options?.includeFunctionInCategory)
			this.#includeFunctionInCategory = options.includeFunctionInCategory;

		if (options?.ignoreCategoryElements)
			this.#ignoreCategoryElements = this.#ignoreCategoryElements.concat(options.ignoreCategoryElements);

		if (options?.replaceElements)
			this.#replaceCategoryElements = options.replaceElements;
	}

	_write(chunk, encoding, callback) {
		// NOTE: Encoding can be ignored, as chunk is a buffer!
		// this.#defaultConsole.log(`Got chunks: ${chunk.toString().trim()}`);

		// who called us?
		const stackTrace = new Error().stack
			.split('\n')
			.map(str => str.trim())
			.slice(1).
			map(str => str.split(' ').slice(1).join(' '));

		// this.#defaultConsole.debug(stackTrace);

		// Find last
		let levelIndex;
		for (let i = 0; i < stackTrace.length; i++) {
			if (stackTrace[i].match(/console\..*/gu))
				levelIndex = i;
		}

		// this.#defaultConsole.debug("Level index", levelIndex);

		this.#writeToLogger(
			chunk.toString().trim(),
			stackTrace[levelIndex].split(' ').shift().split('.').pop(),
			stackTrace[levelIndex + 1],
			levelIndex + 1);

		callback();
	}

	#reloadConfig = (event, filename) =>
	{
		console.debug(`reloading config for log4js`);
		try
		{
			log4js.shutdown(err =>
			{
				if (err !== undefined)
					this.#defaultConsole.error(`shutting down log4js error: ${err}`);
			});
			log4js.configure(filename);
		}
		catch (e)
		{
			this.#defaultConsole.error(`Error while reconfiguring logging: ${e}`);
		}
	};

	#writeToLogger(data, level, caller, callerIndex)
	{
		// get logger with correct category (based on the caller)

		// this.#defaultConsole.log(`Function: ${level}, caller: ${caller}`);
		const callString = this.#getCallerName(caller);
		// this.#defaultConsole.log("Caller is:", callString);

		// check if data has multiple lines, and if so, prepend each with a tab
		let dataLines = data.split('\n');
		// this.#defaultConsole.log(dataLines);
		if(dataLines.length > 1) {
			dataLines = dataLines.map(str => `    ${str}`)
			dataLines.unshift(""); // add a new line at the beginning
		}

		// get the logger
		const logger = log4js.getLogger(callString);
		logger.callStackLinesToSkip = callerIndex + 1;

		// this.#defaultConsole.log(`Logging function: ${level}`);
		if (Object.keys(this.#addLevels).includes(level))
			logger[this.#addLevels[level]](dataLines.join('\n'));
		else
			logger[level](dataLines.join('\n'));

		// this.#defaultConsole.log(`Data: ${dataLines.join('\n')}`);
	}

	#getCallerName(callString)
	{
		let stack = callString.split(' ');

		// this.#defaultConsole.group("getCallerName");

		// filter out stack garbage
		stack = stack.filter(v => (v !== ''));

		let functionName;
		let fileElement;
		if(stack.length === 2) {
			// we have class.function at first position and file at second position
			[functionName, fileElement] = stack;
		} else if (stack.length === 1) {
			// we have only file element
			[fileElement] = stack;
		} else {
			this.#defaultConsole.error(`Error while evaluating caller name, too manu or too few elements in the caller name stack`);
			// this.#defaultConsole.groupEnd("getCallerName");
			return "unknown";
		}

		let callerElements = [];
		// first handle file element
		if(fileElement) { // we should always have this, but you can be never sure

			// handle paths enclosed with ()
			fileElement = fileElement.replace(/\((.*)\)/g, "$1");
			// this.#defaultConsole.debug("File string", fileElement);

			// path.sep
			if (fileElement.startsWith(`file:${path.sep}${path.sep}`)) {
				// this.#defaultConsole.debug("Found file:// at the start");
				fileElement = fileElement.replace('file://', '');
			}
			// this.#defaultConsole.debug("File string", fileElement);

			fileElement = fileElement.replace(appRootDir + path.sep, '');
			// this.#defaultConsole.debug("File string", fileElement);

			// get only filename, ignore location
			[fileElement] = fileElement.split(':');
			// this.#defaultConsole.debug("File string", fileElement);

			// last dot determines extension
			fileElement = fileElement.split('.').slice(0, -1).join('.');
			// this.#defaultConsole.debug("File string", fileElement);

			// replace all remaining dots (hopefully)
			fileElement = fileElement.replace(/\./g,'_');
			// this.#defaultConsole.debug("File string", fileElement);

			let fileElements = fileElement.split(path.sep);
			// this.#defaultConsole.debug("file elements", fileElements);

			// filter out stuff we don't want
			for(const elem of this.#ignoreCategoryElements)
				fileElements = fileElements.filter(v => v !== elem);

			// Special handling for stuff that came from node_modules
			if(fileElements[0] === 'node_modules') {
				callerElements.push(this.#modulePrefix);
				fileElements.shift();

				// check for scoped modules
				if (fileElements[0].startsWith('@') && fileElements.length >= 2)
					callerElements.push(`${fileElements[0]}/${fileElements[1]}`);
				else
					callerElements.push(fileElements[0]);

				// ignore the rest as we don't want to know which file precisely logged
			} else {
				callerElements = fileElements;
			}

			// this.#defaultConsole.debug("final caller file elements", callerElements);
		}

		// this.#defaultConsole.debug('Caller function: ', functionName);
		if(functionName && this.#includeFunctionInCategory && functionName !== 'Object.<anonymous>') {
			let callerFunction = functionName.split('.');

			for(const elem of this.#ignoreCategoryElements)
				callerFunction = callerFunction.filter(v => v !== elem);
			// this.#defaultConsole.debug('Caller function elements', callerFunction);

			if (callerFunction.length > 0)
				callerElements.push(...callerFunction);
		}

		// this.#defaultConsole.debug("final caller elements", callerElements);

		let caller = callerElements.join('.')

		for (const replace of this.#replaceCategoryElements) {
			// this.#defaultConsole.debug(caller);
			// this.#defaultConsole.debug(`Replacing ${replace.source} with ${replace.replacement}`);
			caller = caller.replace(replace.source, replace.replacement);
			// this.#defaultConsole.debug(caller);
		}

		// this.#defaultConsole.debug('Returning caller', caller);
		// this.#defaultConsole.groupEnd("getCallerName");
		return caller;
	}
}

module.exports = Log4JsStream;
