/**
 * Court-holiday calendars built from rules in YAML ("the 4th Thursday of
 * November") rather than hand-typed lists of dates, so they never go stale.
 */
import {
	addDays,
	daysInMonth,
	isWeekend,
	makeDate,
	weekday,
	yearOf,
	type ISODate
} from './civil-date.ts';
import type { HolidayDef, LocalizedText } from './schema.ts';

export interface HolidayInstance {
	id: string;
	name: LocalizedText;
	/** The day courts are closed. */
	date: ISODate;
	/** The day the holiday actually falls on, when it is observed on a different day. */
	actual?: ISODate;
}

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

/** The nth weekday of a month (nth = -1 means the last one). Null when it doesn't exist. */
export function nthWeekday(year: number, month: number, day: number, nth: number): ISODate | null {
	if (nth === -1) {
		const last = makeDate(year, month, daysInMonth(year, month));
		const back = (weekday(last) - day + 7) % 7;
		return addDays(last, -back);
	}
	const first = makeDate(year, month, 1);
	const forward = (day - weekday(first) + 7) % 7;
	const dayOfMonth = 1 + forward + (nth - 1) * 7;
	if (dayOfMonth > daysInMonth(year, month)) return null;
	return makeDate(year, month, dayOfMonth);
}

function occurrence(rule: HolidayDef, year: number): HolidayInstance | null {
	if (rule.since !== undefined && year < rule.since) return null;
	if (rule.until !== undefined && year > rule.until) return null;
	const spec = rule.date;

	if ('weekday' in spec) {
		const base = nthWeekday(year, spec.month, WEEKDAYS.indexOf(spec.weekday), spec.nth);
		if (!base) return null;
		return { id: rule.id, name: rule.name, date: addDays(base, spec.offset_days ?? 0) };
	}

	if (spec.day > daysInMonth(year, spec.month)) return null;
	const actual = makeDate(year, spec.month, spec.day);
	const observedRule = spec.observed ?? 'nearest_weekday';
	const dow = weekday(actual);
	let date = actual;
	if (observedRule !== 'none') {
		if (dow === 0) date = addDays(actual, 1);
		else if (dow === 6 && observedRule === 'nearest_weekday') date = addDays(actual, -1);
	}
	return date === actual
		? { id: rule.id, name: rule.name, date }
		: { id: rule.id, name: rule.name, date, actual };
}

/**
 * All holidays observed during `year`. Includes holidays observed in this
 * year that actually fall in a neighbouring one (e.g. New Year's Day on a
 * Saturday is observed on Friday, December 31).
 */
export function holidaysForYear(rules: readonly HolidayDef[], year: number): HolidayInstance[] {
	const result: HolidayInstance[] = [];
	for (const candidateYear of [year - 1, year, year + 1]) {
		for (const rule of rules) {
			const instance = occurrence(rule, candidateYear);
			if (instance && yearOf(instance.date) === year) result.push(instance);
		}
	}
	return result.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export class HolidayCalendar {
	readonly rules: readonly HolidayDef[];
	readonly #byYear = new Map<number, Map<ISODate, HolidayInstance[]>>();

	constructor(rules: readonly HolidayDef[]) {
		this.rules = rules;
	}

	#year(year: number): Map<ISODate, HolidayInstance[]> {
		let map = this.#byYear.get(year);
		if (!map) {
			map = new Map();
			for (const holiday of holidaysForYear(this.rules, year)) {
				const list = map.get(holiday.date) ?? [];
				list.push(holiday);
				map.set(holiday.date, list);
			}
			this.#byYear.set(year, map);
		}
		return map;
	}

	/** Holidays observed on this date (usually zero or one). */
	holidaysOn(date: ISODate): HolidayInstance[] {
		return this.#year(yearOf(date)).get(date) ?? [];
	}

	isHoliday(date: ISODate): boolean {
		return this.holidaysOn(date).length > 0;
	}

	/** A weekday that is not a court holiday. */
	isCourtDay(date: ISODate): boolean {
		return !isWeekend(date) && !this.isHoliday(date);
	}

	list(year: number): HolidayInstance[] {
		return [...this.#year(year).values()].flat();
	}
}

/**
 * Build a jurisdiction's holiday rules: start from the extended calendars,
 * drop removed ids, then add (or replace) local holidays.
 */
export function mergeHolidayRules(
	base: readonly HolidayDef[],
	remove: readonly string[],
	add: readonly HolidayDef[]
): HolidayDef[] {
	const removed = new Set([...remove, ...add.map((holiday) => holiday.id)]);
	return [...base.filter((holiday) => !removed.has(holiday.id)), ...add];
}
