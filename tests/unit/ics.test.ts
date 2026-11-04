import { describe, expect, it } from 'vitest';
import { createCalendar, escapeText, foldLine } from '../../src/lib/engine/ics.ts';

describe('calendar export', () => {
	it('escapes special characters', () => {
		expect(escapeText('a, b; c\\d\ne')).toBe('a\\, b\\; c\\\\d\\ne');
	});

	it('folds long lines at 75 octets', () => {
		const folded = foldLine('DESCRIPTION:' + 'é'.repeat(80));
		for (const line of folded.split('\r\n'))
			expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
		expect(folded.replace(/\r\n /g, '')).toBe('DESCRIPTION:' + 'é'.repeat(80));
	});

	it('creates an all-day event with reminders', () => {
		const ics = createCalendar(
			[
				{
					uid: 'abc@tenantkit',
					date: '2026-12-08',
					title: 'Respond to eviction',
					description: 'File your answer',
					remindDaysBefore: [3, 1]
				}
			],
			new Date('2026-11-04T12:00:00Z')
		);
		expect(ics).toContain('BEGIN:VCALENDAR\r\n');
		expect(ics).toContain('DTSTART;VALUE=DATE:20261208\r\n');
		expect(ics).toContain('DTEND;VALUE=DATE:20261209\r\n');
		expect(ics).toContain('DTSTAMP:20261104T120000Z\r\n');
		expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
		expect(ics).toContain('TRIGGER:-P3D');
		expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
	});
});
