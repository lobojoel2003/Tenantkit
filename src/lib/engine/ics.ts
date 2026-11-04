/**
 * Calendar files (.ics) so people can put a deadline in their phone's
 * calendar with reminders. Generated in the browser; nothing is uploaded.
 */
import { addDays, type ISODate } from './civil-date.ts';

export interface CalendarEvent {
	/** Stable id, so re-importing updates the event instead of duplicating it. */
	uid: string;
	date: ISODate;
	title: string;
	description: string;
	url?: string;
	/** Reminders, in days before the event. */
	remindDaysBefore?: number[];
}

/** Escape text per RFC 5545 §3.3.11. */
export function escapeText(value: string): string {
	return value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Fold lines longer than 75 octets (RFC 5545 §3.1). */
export function foldLine(line: string): string {
	const encoder = new TextEncoder();
	if (encoder.encode(line).length <= 75) return line;
	const parts: string[] = [];
	let current = '';
	let size = 0;
	for (const char of line) {
		const charSize = encoder.encode(char).length;
		const limit = parts.length === 0 ? 75 : 74;
		if (size + charSize > limit) {
			parts.push(current);
			current = '';
			size = 0;
		}
		current += char;
		size += charSize;
	}
	parts.push(current);
	return parts.join('\r\n ');
}

const compact = (date: ISODate) => date.replace(/-/g, '');

export function createCalendar(events: CalendarEvent[], now: Date = new Date()): string {
	const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
	const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tenantkit//Tenantkit//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
	for (const event of events) {
		lines.push(
			'BEGIN:VEVENT',
			`UID:${event.uid}`,
			`DTSTAMP:${stamp}`,
			`DTSTART;VALUE=DATE:${compact(event.date)}`,
			`DTEND;VALUE=DATE:${compact(addDays(event.date, 1))}`,
			`SUMMARY:${escapeText(event.title)}`,
			`DESCRIPTION:${escapeText(event.description)}`,
			'TRANSP:TRANSPARENT'
		);
		if (event.url) lines.push(`URL:${event.url}`);
		for (const days of event.remindDaysBefore ?? []) {
			lines.push(
				'BEGIN:VALARM',
				'ACTION:DISPLAY',
				`DESCRIPTION:${escapeText(event.title)}`,
				`TRIGGER:-P${days}D`,
				'END:VALARM'
			);
		}
		lines.push('END:VEVENT');
	}
	lines.push('END:VCALENDAR');
	return lines.map(foldLine).join('\r\n') + '\r\n';
}
