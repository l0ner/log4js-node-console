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

const { Writable } = require("node:stream");
const AppRootDir = require("app-root-dir");
const log4js = require('log4js');

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
	#includeFunctionInCategory = true;

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

		if (options?.includeFunctionInCategory)
			this.#includeFunctionInCategory = options.includeFunctionInCategory;

		if (options?.ignoreCategoryElements)
			this.#ignoreCategoryElements = this.#ignoreCategoryElements.concat(options.ignoreCategoryElements);
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

		const levelIndex = stackTrace.findLastIndex(str => str.match(/console\..*/gu));
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

		// filter out stack garbage
		stack = stack.filter(v => (v !== ''));

		// handle ESModule anonymous file level calls
		if (stack.length === 1 && stack[0].startsWith('file://')) {
			stack.unshift('Object.<anonymous>');
			stack[1] = `(${stack[1]})`;
		}
		stack[1] = stack[1].replace('file://', '');

		// this.#defaultConsole.debug('Stack elements', stack);

		// this.#defaultConsole.debug('App root dir', appRootDir);
		let callerFileElements = stack.pop()
			.replace(appRootDir, '')
			.split('.')[0]
			.split('/')
			.slice(1);
		// this.#defaultConsole.debug('caller file elements', callerFileElements);

		for(const elem of this.#ignoreCategoryElements)
			callerFileElements = callerFileElements.filter(v => v !== elem);
		// this.#defaultConsole.debug('Caller file elements', callerFileElements);

		// at this point, if the file elements starts with node_modules, treat it specially
		if(callerFileElements[0] === 'node_modules') {
			callerFileElements.shift() // remove node_modules

			const libraryNameElements = ['modules'];

			let tmp = callerFileElements.shift();
			if(tmp.startsWith('@')) { // scoped package
				libraryNameElements.push(tmp)
				tmp = callerFileElements.shift();
			}

			libraryNameElements.push(tmp);

			// this.#defaultConsole.debug('Remaining items in file elements', callerFileElements);

			callerFileElements = libraryNameElements;
		}

		let caller = callerFileElements.join('.');
		// this.#defaultConsole.debug('Caller', caller);

		const functionName = stack.pop();
		// this.#defaultConsole.debug('Caller function: ', functionName);
		if(this.#includeFunctionInCategory && functionName !== 'Object.<anonymous>') {
			let callerFunction = functionName.split('.');

			for(const elem of this.#ignoreCategoryElements)
				callerFunction = callerFunction.filter(v => v !== elem);
			// this.#defaultConsole.debug('Caller function elements', callerFunction);
			if(callerFunction.length > 0)
				caller += `.${callerFunction.join('.')}()`; // always remove 'Object' to make modules appear nicely
		}

		// this.#defaultConsole.debug('Caller', caller);

		// make sure that the caller name never starts with a dot
		if (caller.startsWith('.'))
		caller = caller.substring(1);

		// this.#defaultConsole.debug('Returning caller', caller);
		return caller;
	}
}

module.exports = Log4JsStream;
