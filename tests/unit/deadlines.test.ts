import { describe, expect, it } from 'vitest';
import {
	computeDeadline,
	computeRule,
	findChoice,
	urgency
} from '../../src/lib/engine/deadlines.ts';
import { HolidayCalendar } from '../../src/lib/engine/holidays.ts';
import type { HolidayDef } from '../../src/lib/engine/schema.ts';

const name = { en: 'x' };
const calendar = new HolidayCalendar([
	{ id: 'veterans-day', name, date: { month: 11, day: 11, observed: 'nearest_weekday' } },
	{ id: 'thanksgiving', name, date: { month: 11, weekday: 'thu', nth: 4, offset_days: 0 } },
	{
		id: 'day-after-thanksgiving',
		name,
		date: { month: 11, weekday: 'thu', nth: 4, offset_days: 1 }
	},
	{ id: 'christmas', name, date: { month: 12, day: 25, observed: 'nearest_weekday' } }
] satisfies HolidayDef[]);

describe('computeDeadline', () => {
	it('counts calendar days without counting the first day', () => {
		const result = computeDeadline({
			trigger: '2026-11-04',
			period: { amount: 21, unit: 'calendar_days' },
			calendar
		});
		expect(result.due).toBe('2026-11-25');
		expect(result.skipped).toEqual([]);
	});

	it('counts court days, skipping weekends and holidays', () => {
		// Served Friday Nov 20, 2026. Court days: Nov 23, 24, 25, (26-27 holidays), 30, Dec 1, 2, 3, 4, 7, 8.
		const result = computeDeadline({
			trigger: '2026-11-20',
			period: { amount: 10, unit: 'court_days' },
			calendar
		});
		expect(result.due).toBe('2026-12-08');
		expect(result.counted).toEqual([
			'2026-11-23',
			'2026-11-24',
			'2026-11-25',
			'2026-11-30',
			'2026-12-01',
			'2026-12-02',
			'2026-12-03',
			'2026-12-04',
			'2026-12-07',
			'2026-12-08'
		]);
		expect(result.skipped.map((day) => [day.date, day.reason])).toEqual([
			['2026-11-21', 'weekend'],
			['2026-11-22', 'weekend'],
			['2026-11-26', 'holiday'],
			['2026-11-27', 'holiday'],
			['2026-11-28', 'weekend'],
			['2026-11-29', 'weekend'],
			['2026-12-05', 'weekend'],
			['2026-12-06', 'weekend']
		]);
	});

	it('counts 3 court days starting on a weekend', () => {
		// Notice received Saturday Nov 7 → Mon 9, Tue 10, (Wed 11 Veterans Day), Thu 12.
		const result = computeDeadline({
			trigger: '2026-11-07',
			period: { amount: 3, unit: 'court_days' },
			calendar
		});
		expect(result.due).toBe('2026-11-12');
	});

	it('adds days before counting (e.g. service by mail)', () => {
		const result = computeDeadline({
			trigger: '2026-11-02',
			addDays: 10,
			period: { amount: 3, unit: 'court_days' },
			calendar
		});
		expect(result.start).toBe('2026-11-12');
		expect(result.due).toBe('2026-11-17');
	});

	it('moves a last day that falls on a closed day when asked to', () => {
		// 14 calendar days from Nov 12 = Thu Nov 26 (Thanksgiving) → Fri is closed too → weekend → Mon Nov 30.
		const result = computeDeadline({
			trigger: '2026-11-12',
			period: { amount: 14, unit: 'calendar_days' },
			extendIfClosed: true,
			calendar
		});
		expect(result.movedFrom).toBe('2026-11-26');
		expect(result.due).toBe('2026-11-30');
		expect(result.moved).toHaveLength(4);
		const unmoved = computeDeadline({
			trigger: '2026-11-12',
			period: { amount: 14, unit: 'calendar_days' },
			calendar
		});
		expect(unmoved.due).toBe('2026-11-26');
		expect(unmoved.movedFrom).toBeUndefined();
	});

	it('adds months', () => {
		expect(
			computeDeadline({ trigger: '2026-08-31', period: { amount: 6, unit: 'months' }, calendar })
				.due
		).toBe('2027-02-28');
	});

	it('rounds hours up to whole days', () => {
		expect(
			computeDeadline({ trigger: '2026-11-04', period: { amount: 24, unit: 'hours' }, calendar })
				.due
		).toBe('2026-11-05');
		expect(
			computeDeadline({ trigger: '2026-11-04', period: { amount: 72, unit: 'hours' }, calendar })
				.due
		).toBe('2026-11-07');
		expect(
			computeDeadline({ trigger: '2026-11-04', period: { amount: 30, unit: 'hours' }, calendar })
				.due
		).toBe('2026-11-06');
	});
});

describe('computeRule', () => {
	const rule = {
		period: { amount: 10, unit: 'court_days' as const },
		extend_if_closed: false,
		options: {
			choices: [
				{ id: 'personal', addDays: 0 },
				{ id: 'mail', addDays: 10 },
				{ id: 'hours', addDays: 0, period: { amount: 24, unit: 'hours' as const } }
			]
		}
	};

	it('uses the first choice by default', () => {
		expect(findChoice(rule)?.id).toBe('personal');
		expect(findChoice(rule, 'missing')?.id).toBe('personal');
		expect(findChoice({ options: undefined })).toBeUndefined();
	});

	it('applies the chosen adjustment or period', () => {
		// Nov 3-6, 9, 10, (11 is Veterans Day), 12, 13, 16, 17
		expect(computeRule(rule, '2026-11-02', calendar, 'personal').due).toBe('2026-11-17');
		expect(computeRule(rule, '2026-11-02', calendar, 'mail').start).toBe('2026-11-12');
		expect(computeRule(rule, '2026-11-02', calendar, 'hours').due).toBe('2026-11-03');
	});
});

describe('urgency', () => {
	it('describes how close a date is', () => {
		expect(urgency('2026-11-03', '2026-11-04')).toEqual({ daysLeft: -1, level: 'passed' });
		expect(urgency('2026-11-04', '2026-11-04')).toEqual({ daysLeft: 0, level: 'today' });
		expect(urgency('2026-11-07', '2026-11-04')).toEqual({ daysLeft: 3, level: 'soon' });
		expect(urgency('2026-11-30', '2026-11-04')).toEqual({ daysLeft: 26, level: 'upcoming' });
	});
});
