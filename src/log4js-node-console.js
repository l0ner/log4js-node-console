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

const log4js = require('log4js');
const appRootDir = require('app-root-dir').get();

const util = require('node:util');
const stream = require('node:stream');
const { Console } = require('node:console');

let watch = null;
// check if the optional node-watch has been installed nad ignore error
try { watch = require('node-watch'); }
catch (e) { } // eslint-disable-line no-empty

/**
 * Controls how many lines to add to the trace stack when capturing it for the `trace()` function, so we get the desired
 * stack depth while skipping function from this library.
 *
 * @private
 */
const traceOffset = 1;

/** Default trace skip value for log4js loggers */
const traceSkip = 1;

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
class Log4jsConsole
{

	//#region Privates
	#defaultConsole = console;
	#loggerCache = {};
	#counters = {};
	#assertLevel = 'warn';
	#counterLevel = 'debug';
	#dirLevel = 'debug';
	#tableLevel = 'info';
	#timeLevel = 'info';
	#printTrace = false;
	#stackTraceLimit = 10 + traceOffset;
	#includeFunctionInCategory = true;

	#tableTransform = null;
	#tableConsole = null;
	//#endregion

	constructor(config, options)
	{
		log4js.configure(config);

		if (options)
		{
			if (options.watchConfig && watch && Object.prototype.toString.call(config) === "[object String]")
				watch(config, this.#reloadConfig);

			if (options.assertLevel)
				this.#assertLevel = options.assertLevel.toLowerCase();

			if (options.countLevel)
				this.#counterLevel = options.countLevel.toLowerCase();

			if (options.dirLevel)
				this.#dirLevel = options.dirLevel.toLowerCase();

			if (options.tableLevel)
				this.#tableLevel = options.dirLevel.toLowerCase();

			if (options.printTrace)
				this.#tableLevel = options.printTrace;

			if (options.stackTraceLimit)
				this.#stackTraceLimit = options.stackTraceLimit + traceOffset;

			if (options.includeFunctionInCatagory)
				this.#includeFunctionInCategory = options.includeFunctionInCatagory;
		}

		this.#tableTransform = new stream.Transform({ transform(chunk, enc, cb) { cb(null, chunk); } });
		this.#tableConsole = new Console({ stdout: this.#tableTransform });
	}

	//#region Do nothings
	clear() { }
	// eslint-disable-next-line no-unused-vars
	group(...label) { }
	groupCollapsed() { }
	groupEnd() { }
	//#endregion

	//#region Counters
	count(label = 'default')
	{
		if (!Object.keys(this.#counters).includes(label))
			this.#counters[label] = 0;

		this.#counters[label] += 1;

		const logger = this.#getLogger(this.#getCallerName());
		logger.callStackLinesToSkip = 0;
		logger.log(this.#counterLevel, `${label}: ${this.#counters[label]}`);
		logger.callStackLinesToSkip = traceSkip;

	}

	countReset(label = 'default')
	{
		this.#counters[label] = 0;
	}
	//#endregion

	//#region Timings
	time(label = 'default')
	{
		this.#tableConsole.time(label);
	}
	timeEnd(label = 'default')
	{
		this.#tableConsole.timeEnd(label);
		const logger = this.#getLogger(this.#getCallerName(), 0);
		logger.callStackLinesToSkip = 0;
		logger.log(this.#timeLevel, this.#tableTransform.read().toString().trim());
		logger.callStackLinesToSkip = traceSkip;
	}
	timeLog(label = 'default', ...data)
	{
		this.#tableConsole.timeLog(label, data);
		const logger = this.#getLogger(this.#getCallerName(), 0);
		logger.callStackLinesToSkip = 0;
		logger.log(this.#timeLevel, this.#tableTransform.read().toString().trim());
		logger.callStackLinesToSkip = traceSkip;
	}
	//#endregion

	//#region Object inspection
	dir(obj, options)
	{
		const showHidden = options && options.showHidden ? options.showHidden : false;
		const depth = options && options.depth ? options.depth : 2;
		const colors = options && options.colors ? options.colors : false;

		const logger = this.#getLogger(this.#getCallerName());
		logger.callStackLinesToSkip = 0;
		logger.log(this.#dirLevel, util.inspect(obj, showHidden, depth, colors));
		logger.callStackLinesToSkip = traceSkip;
	}

	dirxml(...data)
	{
		const logger = this.#getLogger(this.#getCallerName());
		const stackSkip = logger.callStackLinesToSkip;
		logger.callStackLinesToSkip = 0;
		logger.log(this.#dirLevel, data);
		logger.callStackLinesToSkip = stackSkip;
	}
	//#endregion

	//#region Logging functions
	trace(message, ...args)
	{
		let stack = '';
		if (this.#printTrace)
		{
			const defaultStackDepth = Error.stackTraceLimit;
			Error.stackTraceLimit = this.#stackTraceLimit;
			stack = `\n${new Error().stack.split('\n').slice(2).join('\n')}`;
			Error.stackTraceLimit = defaultStackDepth;
		}
		this.#getLogger(this.#getCallerName()).trace(message, ...args, stack);
	}
	debug(data, ...args) { this.#getLogger(this.#getCallerName()).debug(data, ...args); }
	info(data, ...args) { this.#getLogger(this.#getCallerName()).info(data, ...args); }
	warn(data, ...args) { this.#getLogger(this.#getCallerName()).warn(data, ...args); }
	error(data, ...args) { this.#getLogger(this.#getCallerName()).error(data, ...args); }
	log = this.info;

	table(tabularData, properties)
	{
		this.#tableConsole.table(tabularData, properties);

		const logger = this.#getLogger(this.#getCallerName());
		logger.callStackLinesToSkip = 0;
		logger.log(this.#tableLevel, `\n${this.#tableTransform.read().toString().trim()}`);
		logger.callStackLinesToSkip = traceSkip;
	}
	//#endregion

	//#region Profiling
	profile(label)
	{
		this.#defaultConsole.profile(label);
	}
	profileEnd(label)
	{
		this.#defaultConsole.profileEnd(label);
	}
	timeStamp(label)
	{
		this.#defaultConsole.timeStamp(label);
	}
	//#endregion

	//#region Misc
	assert(value, ...message)
	{
		if(value === '' || !value)
		{
			const logger = this.#getLogger(this.#getCallerName());
			logger.callStackLinesToSkip = 0;
			logger.log(this.#assertLevel, 'Assertion failed:', ...message);
			logger.callStackLinesToSkip = traceSkip;
		}
	}
	//#endregion

	//#region Private utils

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
	}

	#getLogger(caller)
	{
		if (!Object.keys(this.#loggerCache).includes(caller))
		{
			this.#loggerCache[caller] = log4js.getLogger(caller);
			this.#loggerCache[caller].callStackLinesToSkip = traceSkip;
		}

		return this.#loggerCache[caller]
	}

	#getCallerName()
	{
		const stack = new Error().stack.split('\n')[3].split(' ');
		const callerFileElements = stack[6].replace(appRootDir, '').split('.')[0].split('/').slice(1);

		let caller = callerFileElements.join('.');
		if(callerFileElements[0] === 'node_modules')
			caller = `${callerFileElements.slice(0,2).join('.')}.${callerFileElements.slice(-1)}`;

		if(this.#includeFunctionInCategory && stack[5] !== 'Object.<anonymous>')
			caller += `.${stack[5].replace('Object.', '')}()`; // always remove 'Object' to make modules appear nicely


		// this.#defaultConsole.info(callerFileElements[0])

		return caller;
	}

	//#endregion
}

module.exports = Log4jsConsole;