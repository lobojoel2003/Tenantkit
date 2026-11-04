import { describe, expect, it } from 'vitest';
import {
	addDays,
	addMonths,
	diffDays,
	formatDate,
	fromDayNumber,
	isISODate,
	isWeekend,
	parseISODate,
	toDayNumber,
	todayISO,
	weekday
} from '../../src/lib/engine/civil-date.ts';

describe('civil dates', () => {
	it('validates ISO dates, including leap years', () => {
		expect(isISODate('2026-11-04')).toBe(true);
		expect(isISODate('2024-02-29')).toBe(true);
		expect(isISODate('2026-02-29')).toBe(false);
		expect(isISODate('2026-13-01')).toBe(false);
		expect(isISODate('2026-1-01')).toBe(false);
		expect(isISODate(20261104)).toBe(false);
		expect(parseISODate('2026-04-31')).toBeNull();
	});

	it('round-trips day numbers', () => {
		expect(toDayNumber('1970-01-01')).toBe(0);
		expect(fromDayNumber(toDayNumber('2026-11-04'))).toBe('2026-11-04');
		expect(fromDayNumber(-1)).toBe('1969-12-31');
	});

	it('adds days across months, years and DST changes', () => {
		expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
		expect(addDays('2026-03-07', 2)).toBe('2026-03-09');
		expect(addDays('2026-11-01', 7)).toBe('2026-11-08');
		expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
		expect(diffDays('2026-11-04', '2026-12-25')).toBe(51);
	});

	it('adds calendar months, clamping to the end of the month', () => {
		expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
		expect(addMonths('2028-01-31', 1)).toBe('2028-02-29');
		expect(addMonths('2026-11-04', 6)).toBe('2027-05-04');
		expect(addMonths('2027-03-01', 12)).toBe('2028-03-01');
		expect(addMonths('2026-03-15', -3)).toBe('2025-12-15');
	});

	it('knows the day of the week', () => {
		expect(weekday('2026-11-04')).toBe(3); // Wednesday
		expect(weekday('1970-01-01')).toBe(4); // Thursday
		expect(isWeekend('2026-11-07')).toBe(true);
		expect(isWeekend('2026-11-09')).toBe(false);
	});

	it('uses the local date for today', () => {
		expect(todayISO(new Date(2026, 10, 4, 23, 59))).toBe('2026-11-04');
		expect(todayISO(new Date(2026, 0, 1, 0, 1))).toBe('2026-01-01');
	});

	it('formats dates for people in each language', () => {
		expect(formatDate('2026-11-04', 'en', 'long')).toBe('November 4, 2026');
		expect(formatDate('2026-11-04', 'es', 'long')).toBe('4 de noviembre de 2026');
		expect(formatDate('2026-11-04', 'en', 'full')).toBe('Wednesday, November 4, 2026');
	});

	it('rejects invalid input loudly', () => {
		expect(() => addDays('nope', 1)).toThrow(RangeError);
	});
});
