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

export interface Log4jsConsoleOptions
{
	watchConfig: boolean;
	assertLevel: string | Levels;
	countLevel: string | Levels;
	dirLevel: string | Levels;
	tableLevel: string | Levels;
	timeLevel: string | Levels;
	includeFunctionInCategory: boolean;
	ignoreCategoryElements: string[];
}

export enum Levels {
	'error',
	'warn',
	'info',
	'debug',
	'trace'
}
