import { describe, expect, it } from 'vitest';
import { HolidayCalendar, holidaysForYear, mergeHolidayRules, nthWeekday } from '../../src/lib/engine/holidays.ts';
import type { HolidayDef } from '../../src/lib/engine/schema.ts';

const name = { en: 'x' };
const federal: HolidayDef[] = [
	{ id: 'new-years-day', name, date: { month: 1, day: 1, observed: 'nearest_weekday' } },
	{ id: 'mlk-day', name, date: { month: 1, weekday: 'mon', nth: 3, offset_days: 0 } },
	{ id: 'memorial-day', name, date: { month: 5, weekday: 'mon', nth: -1, offset_days: 0 } },
	{ id: 'juneteenth', name, date: { month: 6, day: 19, observed: 'nearest_weekday' }, since: 2021 },
	{ id: 'independence-day', name, date: { month: 7, day: 4, observed: 'nearest_weekday' } },
	{ id: 'thanksgiving', name, date: { month: 11, weekday: 'thu', nth: 4, offset_days: 0 } },
	{ id: 'day-after-thanksgiving', name, date: { month: 11, weekday: 'thu', nth: 4, offset_days: 1 } },
	{ id: 'christmas', name, date: { month: 12, day: 25, observed: 'nearest_weekday' } }
];

describe('holiday rules', () => {
	it('finds nth and last weekdays', () => {
		expect(nthWeekday(2026, 11, 4, 4)).toBe('2026-11-26'); // Thanksgiving 2026
		expect(nthWeekday(2026, 1, 1, 3)).toBe('2026-01-19'); // MLK Day 2026
		expect(nthWeekday(2026, 5, 1, -1)).toBe('2026-05-25'); // Memorial Day 2026
		expect(nthWeekday(2026, 2, 1, 5)).toBeNull(); // no 5th Monday in Feb 2026
	});

	it('moves weekend holidays to the nearest weekday', () => {
		const dates = (year: number) => holidaysForYear(federal, year).map((holiday) => holiday.date);
		// July 4, 2026 is a Saturday → observed Friday July 3.
		expect(dates(2026)).toContain('2026-07-03');
		expect(dates(2026)).not.toContain('2026-07-04');
		// Juneteenth 2027 is a Saturday → Friday June 18.
		expect(dates(2027)).toContain('2027-06-18');
		// Christmas 2027 is a Saturday → Friday Dec 24; New Year's 2028 is a Saturday → Friday Dec 31, 2027.
		expect(dates(2027)).toContain('2027-12-24');
		expect(dates(2027)).toContain('2027-12-31');
		expect(dates(2028)).not.toContain('2027-12-31');
		// Christmas 2022 was a Sunday → Monday Dec 26.
		expect(dates(2022)).toContain('2022-12-26');
	});

	it('respects since/until', () => {
		expect(holidaysForYear(federal, 2020).some((holiday) => holiday.id === 'juneteenth')).toBe(false);
		expect(holidaysForYear(federal, 2021).some((holiday) => holiday.id === 'juneteenth')).toBe(true);
	});

	it('keeps the actual date of shifted holidays', () => {
		const july = holidaysForYear(federal, 2026).find((holiday) => holiday.id === 'independence-day');
		expect(july).toMatchObject({ date: '2026-07-03', actual: '2026-07-04' });
	});

	it('supports "sunday_to_monday" and "none" observance', () => {
		const rules: HolidayDef[] = [
			{ id: 'a', name, date: { month: 7, day: 4, observed: 'sunday_to_monday' } },
			{ id: 'b', name, date: { month: 2, day: 12, observed: 'none' } }
		];
		// 2026-07-04 is Saturday: not moved. 2027-07-04 is Sunday: moved to Monday.
		expect(holidaysForYear(rules, 2026).map((holiday) => holiday.date)).toContain('2026-07-04');
		expect(holidaysForYear(rules, 2027).map((holiday) => holiday.date)).toContain('2027-07-05');
		// 2028-02-12 is Saturday and is not observed elsewhere.
		expect(holidaysForYear(rules, 2028).find((holiday) => holiday.id === 'b')?.date).toBe('2028-02-12');
	});

	it('answers court-day questions', () => {
		const calendar = new HolidayCalendar(federal);
		expect(calendar.isHoliday('2026-11-26')).toBe(true);
		expect(calendar.isCourtDay('2026-11-27')).toBe(false); // day after Thanksgiving
		expect(calendar.isCourtDay('2026-11-28')).toBe(false); // Saturday
		expect(calendar.isCourtDay('2026-11-30')).toBe(true);
		expect(calendar.list(2026)).toHaveLength(8);
	});

	it('merges extended, removed and added holidays', () => {
		const merged = mergeHolidayRules(federal, ['day-after-thanksgiving'], [
			{ id: 'christmas', name: { en: 'Christmas (local)' }, date: { month: 12, day: 25, observed: 'none' } },
			{ id: 'lincoln-day', name, date: { month: 2, day: 12, observed: 'nearest_weekday' } }
		]);
		expect(merged.map((holiday) => holiday.id)).toEqual([
			'new-years-day',
			'mlk-day',
			'memorial-day',
			'juneteenth',
			'independence-day',
			'thanksgiving',
			'christmas',
			'lincoln-day'
		]);
		expect(merged.find((holiday) => holiday.id === 'christmas')?.name.en).toBe('Christmas (local)');
	});
});
