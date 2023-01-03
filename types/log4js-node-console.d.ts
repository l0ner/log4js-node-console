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

type Log4jsConfig = | string | object;

export interface Log4jsConsole
{
	constructor(config: Log4jsConfig, options?: Configuration): Log4jsConsole;

	clear(): undefined;
	group(...label: any): undefined;
	groupCollapsed(): undefined;
	groupEnd(): undefined;
	info(data?: any, ...args: any): undefined;
	log(data?: any, ...args: any): undefined;
	table(tabularData: any, properties?: string[]): undefined;
	time(label?: string): undefined;
	timeEnd(label?: string): undefined;
	timeLog(label?: string, ...data: any): undefined;
	trace(message?: any, ...args: any): undefined;
	warn(data?: any, ...args: any): undefined;
	profile(label?: string): undefined;
	profileEnd(label?: string): undefined;
	timeStamp(label?: string): undefined;

}

export interface Configuration
{
	watchConfig: boolean;
	assertLevel: string | Levels;
	countLevel: string | Levels;
	dirLevel: string | Levels;
	tableLevel: string | Levels;
	timeLevel: string | Levels;
	printTrace: boolean;
	stackTraceLimit: number;
}

export enum Levels {
	'error',
	'warn',
	'info',
	'debug',
	'trace'
}
