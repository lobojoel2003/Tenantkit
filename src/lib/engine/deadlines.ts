/**
 * Deadline counting.
 *
 * Follows the usual rule for legal time periods: the day of the event is not
 * counted, the last day is. Court days skip weekends and court holidays.
 */
import { addDays, addMonths, diffDays, isWeekend, type ISODate } from './civil-date.ts';
import type { HolidayCalendar, HolidayInstance } from './holidays.ts';
import type { DeadlineChoiceDef, DeadlineDef, PeriodDef } from './schema.ts';

export interface SkippedDay {
	date: ISODate;
	reason: 'weekend' | 'holiday';
	holidays: HolidayInstance[];
}

export interface DeadlineResult {
	/** The date the person entered (e.g. the day they were served). */
	trigger: ISODate;
	/** Calendar days added before counting (e.g. for service by mail). */
	addedDays: number;
	/** The day counting starts from (trigger + added days). Not itself counted. */
	start: ISODate;
	period: PeriodDef;
	/** The last day. */
	due: ISODate;
	/** Days that counted toward the period, in order (court days only). */
	counted: ISODate[];
	/** Weekends and holidays skipped while counting court days. */
	skipped: SkippedDay[];
	/** If the last day fell on a closed day and was moved, the original last day. */
	movedFrom?: ISODate;
	/** Closed days the last day was moved past. */
	moved: SkippedDay[];
}

export interface DeadlineInput {
	trigger: ISODate;
	period: PeriodDef;
	addDays?: number;
	extendIfClosed?: boolean;
	calendar: HolidayCalendar;
}

function closedDay(date: ISODate, calendar: HolidayCalendar): SkippedDay | null {
	const holidays = calendar.holidaysOn(date);
	if (holidays.length > 0) return { date, reason: 'holiday', holidays };
	if (isWeekend(date)) return { date, reason: 'weekend', holidays: [] };
	return null;
}

export function computeDeadline(input: DeadlineInput): DeadlineResult {
	const { trigger, period, calendar } = input;
	const added = input.addDays ?? 0;
	const start = addDays(trigger, added);
	const counted: ISODate[] = [];
	const skipped: SkippedDay[] = [];
	let due: ISODate;

	switch (period.unit) {
		case 'calendar_days':
			due = addDays(start, period.amount);
			break;
		case 'months':
			due = addMonths(start, period.amount);
			break;
		case 'hours':
			due = addDays(start, Math.ceil(period.amount / 24));
			break;
		case 'court_days': {
			let cursor = start;
			while (counted.length < period.amount) {
				cursor = addDays(cursor, 1);
				const closed = closedDay(cursor, calendar);
				if (closed) skipped.push(closed);
				else counted.push(cursor);
			}
			due = cursor;
			break;
		}
	}

	const moved: SkippedDay[] = [];
	let movedFrom: ISODate | undefined;
	if (input.extendIfClosed) {
		let closed = closedDay(due, calendar);
		if (closed) movedFrom = due;
		while (closed) {
			moved.push(closed);
			due = addDays(due, 1);
			closed = closedDay(due, calendar);
		}
	}

	const result: DeadlineResult = {
		trigger,
		addedDays: added,
		start,
		period,
		due,
		counted,
		skipped,
		moved
	};
	if (movedFrom) result.movedFrom = movedFrom;
	return result;
}

/** Find the choice for a deadline's optional question (falls back to the first choice). */
export function findChoice(rule: Pick<DeadlineDef, 'options'>, choiceId?: string): DeadlineChoiceDef | undefined {
	const choices = rule.options?.choices;
	if (!choices) return undefined;
	return choices.find((choice) => choice.id === choiceId) ?? choices[0];
}

/** Compute a deadline rule from content for a trigger date and an optional answer. */
export function computeRule(
	rule: Pick<DeadlineDef, 'period' | 'extend_if_closed' | 'options'>,
	trigger: ISODate,
	calendar: HolidayCalendar,
	choiceId?: string
): DeadlineResult {
	const choice = findChoice(rule, choiceId);
	return computeDeadline({
		trigger,
		period: choice?.period ?? rule.period,
		addDays: choice?.add_days ?? 0,
		extendIfClosed: rule.extend_if_closed,
		calendar
	});
}

export type Urgency = 'passed' | 'today' | 'soon' | 'upcoming';

/** How close a deadline is, relative to today. "soon" means within 3 days. */
export function urgency(due: ISODate, today: ISODate): { daysLeft: number; level: Urgency } {
	const daysLeft = diffDays(today, due);
	if (daysLeft < 0) return { daysLeft, level: 'passed' };
	if (daysLeft === 0) return { daysLeft, level: 'today' };
	if (daysLeft <= 3) return { daysLeft, level: 'soon' };
	return { daysLeft, level: 'upcoming' };
}
