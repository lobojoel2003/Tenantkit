/**
 * Turning a letter definition plus someone's answers into finished text.
 */
import { formatDate, isISODate, todayISO, type ISODate } from './civil-date.ts';
import { computeDeadline } from './deadlines.ts';
import type { HolidayCalendar } from './holidays.ts';
import { FRAME_FIELDS, type LocalizedField, type LocalizedLetter } from './model.ts';
import {
	normalizeSegments,
	parseTemplate,
	renderNodes,
	segmentsToText,
	type RenderScope,
	type Segment,
	type TemplateNode
} from './template.ts';

export type FieldValue = string | boolean;
export type FieldValues = Record<string, FieldValue | undefined>;

export interface LetterContext {
	locale: string;
	calendar: HolidayCalendar;
	currency: string;
	jurisdictionName: string;
	/** Today's date; defaults to the user's local date. */
	today?: ISODate;
	/** Placeholder for a date that can't be calculated yet. */
	missingDateLabel?: string;
}

export interface RenderedLetter {
	sender: Segment[][];
	date: Segment[];
	delivery: Segment[] | null;
	recipient: Segment[][];
	subject: Segment[];
	body: Segment[];
	closing: string;
	signature: Segment[];
}

const MAX_PARAM_DEPTH = 4;
const templateCache = new Map<string, TemplateNode[]>();

function parsed(source: string): TemplateNode[] {
	let nodes = templateCache.get(source);
	if (!nodes) {
		nodes = parseTemplate(source);
		templateCache.set(source, nodes);
	}
	return nodes;
}

/** Whether a field is currently shown, based on its show_if rule. */
export function isFieldVisible(field: LocalizedField, values: FieldValues, fields: readonly LocalizedField[]): boolean {
	if (!field.showIf) return true;
	const controller = fields.find((candidate) => candidate.id === field.showIf?.field);
	if (controller && !isFieldVisible(controller, values, fields)) return false;
	const value = values[field.showIf.field] ?? false;
	return value === field.showIf.equals;
}

function isEmpty(value: FieldValue | undefined): boolean {
	return value === undefined || value === false || (typeof value === 'string' && value.trim() === '');
}

/** Starting values for a new letter: field defaults, with "today" resolved. */
export function initialValues(letter: Pick<LocalizedLetter, 'fields'>, today: ISODate = todayISO()): FieldValues {
	const values: FieldValues = {};
	for (const field of letter.fields) {
		if (field.default === undefined) {
			if (field.type === 'checkbox') values[field.id] = false;
			continue;
		}
		values[field.id] = field.type === 'date' && field.default === 'today' ? today : field.default;
	}
	return values;
}

export type FieldProblem = 'required' | 'invalid_date' | 'invalid_email' | 'invalid_money' | 'too_long';

/** Problems with the answers, keyed by field id. Hidden fields are skipped. */
export function validateValues(letter: Pick<LocalizedLetter, 'fields'>, values: FieldValues): Record<string, FieldProblem> {
	const problems: Record<string, FieldProblem> = {};
	for (const field of letter.fields) {
		if (!isFieldVisible(field, values, letter.fields)) continue;
		const value = values[field.id];
		if (isEmpty(value)) {
			if (field.required) problems[field.id] = 'required';
			continue;
		}
		if (typeof value !== 'string') continue;
		const text = value.trim();
		if (field.type === 'date' && !isISODate(text)) problems[field.id] = 'invalid_date';
		else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) problems[field.id] = 'invalid_email';
		else if (field.type === 'money' && parseMoney(text) === null) problems[field.id] = 'invalid_money';
		else if (field.maxLength !== undefined && text.length > field.maxLength) problems[field.id] = 'too_long';
	}
	return problems;
}

/** Read an amount like "1200", "$1,200.50" or "1.200,50". Returns null if it isn't a number. */
export function parseMoney(input: string): number | null {
	let text = input.replace(/[\s$€£]/g, '');
	if (!/^-?[\d.,]+$/.test(text)) return null;
	const lastComma = text.lastIndexOf(',');
	const lastDot = text.lastIndexOf('.');
	if (lastComma > lastDot && text.length - lastComma - 1 <= 2) {
		// Comma is the decimal separator (e.g. 1.200,50).
		text = text.replace(/\./g, '').replace(',', '.');
	} else {
		text = text.replace(/,/g, '');
	}
	const amount = Number(text);
	return Number.isFinite(amount) ? amount : null;
}

export function formatMoney(amount: number, locale: string, currency: string): string {
	return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

/** The date a computed value resolves to, or undefined when its start date isn't filled in. */
export function computedDate(
	letter: Pick<LocalizedLetter, 'computed' | 'fields'>,
	name: string,
	values: FieldValues,
	context: Pick<LetterContext, 'calendar' | 'today'>
): ISODate | undefined {
	const definition = letter.computed[name];
	if (!definition) return undefined;
	const from = definition.from === 'today' ? (context.today ?? todayISO()) : values[definition.from];
	if (typeof from !== 'string' || !isISODate(from)) return undefined;
	return computeDeadline({
		trigger: from,
		period: definition.period,
		addDays: definition.addDays,
		extendIfClosed: definition.extendIfClosed,
		calendar: context.calendar
	}).due;
}

function createScope(letter: LocalizedLetter, values: FieldValues, context: LetterContext, depth: number): RenderScope {
	const fields = new Map(letter.fields.map((field) => [field.id, field]));
	const visible = (field: LocalizedField) => isFieldVisible(field, values, letter.fields);

	const scope: RenderScope = {
		raw(name) {
			const field = fields.get(name);
			if (field) return visible(field) ? values[name] : undefined;
			if (name in letter.computed) return computedDate(letter, name, values, context);
			if (name in letter.params) return letter.params[name] ? 'true' : undefined;
			if (name === 'jurisdiction_name') return context.jurisdictionName;
			return undefined;
		},
		text(name) {
			const field = fields.get(name);
			if (field) {
				const value = visible(field) ? values[name] : undefined;
				if (isEmpty(value) || typeof value !== 'string') return undefined;
				const text = value.trim();
				switch (field.type) {
					case 'date':
						return isISODate(text) ? formatDate(text, context.locale, 'long') : text;
					case 'money': {
						const amount = parseMoney(text);
						return amount === null ? text : formatMoney(amount, context.locale, context.currency);
					}
					case 'select':
						return field.options?.find((option) => option.value === text)?.label ?? text;
					default:
						return text;
				}
			}
			if (name in letter.computed) {
				const date = computedDate(letter, name, values, context);
				return date ? formatDate(date, context.locale, 'long') : undefined;
			}
			const param = letter.params[name];
			if (param !== undefined) {
				if (depth >= MAX_PARAM_DEPTH) throw new Error(`Text block "${name}" refers to itself`);
				return normalizeSegments(renderNodes(parsed(param), createScope(letter, values, context, depth + 1)));
			}
			if (name === 'jurisdiction_name') return context.jurisdictionName;
			return undefined;
		},
		placeholder(name) {
			const field = fields.get(name);
			if (field) return `[${field.label}]`;
			if (name in letter.computed) return `[${context.missingDateLabel ?? '…'}]`;
			return `[${name}]`;
		}
	};
	return scope;
}

function line(scope: RenderScope, name: string): Segment[] {
	return normalizeSegments(renderNodes([{ type: 'var', name }], scope));
}

/** Split segments into lines, keeping value highlights. */
export function splitLines(segments: readonly Segment[]): Segment[][] {
	const lines: Segment[][] = [[]];
	for (const segment of segments) {
		const parts = segment.text.split('\n');
		parts.forEach((part, index) => {
			if (index > 0) lines.push([]);
			if (part !== '') lines.at(-1)?.push({ ...segment, text: part });
		});
	}
	return lines;
}

export function renderLetter(letter: LocalizedLetter, values: FieldValues, context: LetterContext): RenderedLetter {
	const scope = createScope(letter, values, context, 0);
	const has = (name: string) => !isEmpty(scope.raw(name) as FieldValue | undefined);
	const f = FRAME_FIELDS;

	const address = has(f.tenantAddress) ? f.tenantAddress : f.rentalAddress;
	const sender = [
		...splitLines(line(scope, f.tenantName)),
		...splitLines(line(scope, address)),
		...(has(f.tenantPhone) ? splitLines(line(scope, f.tenantPhone)) : []),
		...(has(f.tenantEmail) ? splitLines(line(scope, f.tenantEmail)) : [])
	];
	const recipient = [
		...splitLines(line(scope, f.landlordName)),
		...splitLines(line(scope, f.landlordAddress))
	];

	return {
		sender,
		date: line(scope, f.letterDate),
		delivery: has(f.deliveryMethod) ? line(scope, f.deliveryMethod) : null,
		recipient,
		subject: normalizeSegments(renderNodes(parsed(letter.subject), scope)),
		body: normalizeSegments(renderNodes(parsed(letter.body), scope)),
		closing: letter.closing,
		signature: line(scope, f.tenantName)
	};
}

/** The finished letter as plain text, for copying or saving. */
export function letterToText(rendered: RenderedLetter): string {
	const lines = (block: Segment[][]) => block.map((segments) => segmentsToText(segments)).join('\n');
	const parts = [
		lines(rendered.sender),
		segmentsToText(rendered.date),
		[rendered.delivery ? segmentsToText(rendered.delivery) : null, lines(rendered.recipient)]
			.filter(Boolean)
			.join('\n'),
		segmentsToText(rendered.subject),
		segmentsToText(rendered.body),
		`${rendered.closing}\n\n\n${segmentsToText(rendered.signature)}`
	];
	return parts.join('\n\n') + '\n';
}

/** True when any part of the letter still shows a placeholder. */
export function hasMissingValues(rendered: RenderedLetter): boolean {
	const all = [
		...rendered.sender.flat(),
		...rendered.date,
		...(rendered.delivery ?? []),
		...rendered.recipient.flat(),
		...rendered.subject,
		...rendered.body,
		...rendered.signature
	];
	return all.some((segment) => segment.type === 'value' && segment.missing);
}
