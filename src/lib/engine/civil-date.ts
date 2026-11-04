/**
 * Calendar dates without times or time zones.
 *
 * Legal deadlines are counted in whole days, so all date math works on
 * `YYYY-MM-DD` strings converted to day numbers (days since 1970-01-01).
 * This avoids daylight-saving and time-zone bugs entirely.
 */

export type ISODate = string;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

export interface DateParts {
	year: number;
	month: number;
	day: number;
}

export function daysInMonth(year: number, month: number): number {
	return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function parseISODate(value: string): DateParts | null {
	const match = ISO_RE.exec(value);
	if (!match) return null;
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
	return { year, month, day };
}

export function isISODate(value: unknown): value is ISODate {
	return typeof value === 'string' && parseISODate(value) !== null;
}

function mustParse(value: ISODate): DateParts {
	const parts = parseISODate(value);
	if (!parts) throw new RangeError(`Invalid date: "${value}" (expected YYYY-MM-DD)`);
	return parts;
}

export function makeDate(year: number, month: number, day: number): ISODate {
	return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function toDayNumber(value: ISODate): number {
	const { year, month, day } = mustParse(value);
	return Math.round(Date.UTC(year, month - 1, day) / MS_PER_DAY);
}

export function fromDayNumber(dayNumber: number): ISODate {
	const date = new Date(dayNumber * MS_PER_DAY);
	return makeDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function addDays(value: ISODate, days: number): ISODate {
	return fromDayNumber(toDayNumber(value) + days);
}

/** Add calendar months, keeping the day of the month where possible (Jan 31 + 1 month = Feb 28). */
export function addMonths(value: ISODate, months: number): ISODate {
	const { year, month, day } = mustParse(value);
	const index = year * 12 + (month - 1) + months;
	const newYear = Math.floor(index / 12);
	const newMonth = (index % 12) + 1;
	return makeDate(newYear, newMonth, Math.min(day, daysInMonth(newYear, newMonth)));
}

/** Number of days from `from` to `to` (positive when `to` is later). */
export function diffDays(from: ISODate, to: ISODate): number {
	return toDayNumber(to) - toDayNumber(from);
}

/** Day of the week: 0 = Sunday … 6 = Saturday. */
export function weekday(value: ISODate): number {
	// 1970-01-01 was a Thursday (4).
	return (((toDayNumber(value) + 4) % 7) + 7) % 7;
}

export function isWeekend(value: ISODate): boolean {
	const day = weekday(value);
	return day === 0 || day === 6;
}

export function yearOf(value: ISODate): number {
	return mustParse(value).year;
}

export function compareDates(a: ISODate, b: ISODate): number {
	return toDayNumber(a) - toDayNumber(b);
}

/** Today's date in the user's own time zone. */
export function todayISO(now: Date = new Date()): ISODate {
	return makeDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function toUTCDate(value: ISODate): Date {
	const { year, month, day } = mustParse(value);
	return new Date(Date.UTC(year, month - 1, day));
}

export type DateStyle = 'full' | 'long' | 'medium' | 'short';

/** Format a date for people, e.g. "Tuesday, November 4, 2026" or "martes, 4 de noviembre de 2026". */
export function formatDate(value: ISODate, locale: string, style: DateStyle = 'long'): string {
	return new Intl.DateTimeFormat(locale, { dateStyle: style, timeZone: 'UTC' }).format(
		toUTCDate(value)
	);
}

export function formatWeekday(
	value: ISODate,
	locale: string,
	style: 'long' | 'short' = 'short'
): string {
	return new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' }).format(
		toUTCDate(value)
	);
}
