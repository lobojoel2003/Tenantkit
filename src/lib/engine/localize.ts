/**
 * Turn merged content into one language, falling back to English where a
 * translation is missing (and remembering that it did, so the page can say so).
 */
import type { ResolvedJurisdiction, ResolvedLetterDef } from './loader.ts';
import type {
	JurisdictionSummary,
	LocalizedCitation,
	LocalizedDeadline,
	LocalizedField,
	LocalizedJurisdiction,
	LocalizedLetter
} from './model.ts';
import {
	TOPICS,
	type CitationDef,
	type DeadlineDef,
	type FieldDef,
	type LocalizedText,
	type TopicId
} from './schema.ts';

export class Translator {
	untranslated = false;

	constructor(readonly locale: string) {}

	text(value: LocalizedText): string {
		const translated = value[this.locale];
		if (translated !== undefined) return translated;
		if (this.locale !== 'en') this.untranslated = true;
		return value.en;
	}

	optional(value: LocalizedText | undefined): string | undefined {
		return value === undefined ? undefined : this.text(value);
	}

	citation(citation: CitationDef): LocalizedCitation {
		const note = this.optional(citation.note);
		return note === undefined
			? { label: citation.label, url: citation.url }
			: { label: citation.label, url: citation.url, note };
	}
}

/** Strip undefined values so objects serialize cleanly. */
function clean<T extends object>(value: T): T {
	return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

export function topicsOf(jurisdiction: ResolvedJurisdiction): TopicId[] {
	const used = new Set<TopicId>([
		...jurisdiction.deadlines.map((deadline) => deadline.topic),
		...jurisdiction.letters.map((letter) => letter.topic)
	]);
	return TOPICS.filter((topic) => used.has(topic));
}

export function summarizeJurisdiction(
	jurisdiction: ResolvedJurisdiction,
	locale: string
): JurisdictionSummary {
	const t = new Translator(locale);
	const { def } = jurisdiction;
	return {
		id: def.id,
		name: t.text(def.name),
		shortName: def.short_name,
		kind: def.kind,
		status: def.status,
		lastReviewed: def.last_reviewed,
		summary: t.text(def.summary),
		topics: topicsOf(jurisdiction),
		deadlineCount: jurisdiction.deadlines.length,
		letterCount: jurisdiction.letters.length
	};
}

export function localizeJurisdiction(
	jurisdiction: ResolvedJurisdiction,
	locale: string
): LocalizedJurisdiction {
	const t = new Translator(locale);
	const { def } = jurisdiction;
	const result: LocalizedJurisdiction = {
		...summarizeJurisdiction(jurisdiction, locale),
		name: t.text(def.name),
		summary: t.text(def.summary),
		country: def.country,
		currency: def.currency,
		reviewedBy: def.reviewed_by,
		help: def.help.map((help) =>
			clean({
				name: help.name,
				url: help.url,
				phone: help.phone,
				description: t.text(help.description),
				topics: help.topics
			})
		),
		sources: def.sources.map((citation) => t.citation(citation)),
		holidayRules: jurisdiction.holidayRules,
		holidayNote: t.optional(def.holidays?.note),
		holidaySources: jurisdiction.holidaySources.map((citation) => t.citation(citation)),
		untranslated: false
	};
	result.untranslated = t.untranslated;
	return clean(result);
}

export function localizeDeadline(
	deadline: DeadlineDef,
	jurisdiction: ResolvedJurisdiction,
	locale: string
): LocalizedDeadline {
	const t = new Translator(locale);
	const letterTitles = new Map(jurisdiction.letters.map((letter) => [letter.id, letter.title]));
	const result: LocalizedDeadline = clean({
		id: deadline.id,
		topic: deadline.topic,
		kind: deadline.kind,
		urgent: deadline.urgent,
		title: t.text(deadline.title),
		summary: t.text(deadline.summary),
		trigger: t.text(deadline.trigger),
		period: deadline.period,
		extend_if_closed: deadline.extend_if_closed,
		options: deadline.options && {
			id: deadline.options.id,
			question: t.text(deadline.options.question),
			choices: deadline.options.choices.map((choice) =>
				clean({
					id: choice.id,
					label: t.text(choice.label),
					addDays: choice.add_days,
					period: choice.period,
					note: t.optional(choice.note)
				})
			)
		},
		explanation: t.text(deadline.explanation),
		ifMissed: t.optional(deadline.if_missed),
		steps: deadline.steps.map((step) => t.text(step)),
		letters: deadline.letters
			.filter((id) => letterTitles.has(id))
			.map((id) => ({ id, title: t.text(letterTitles.get(id) as LocalizedText) })),
		citations: deadline.citations.map((citation) => t.citation(citation)),
		untranslated: false
	});
	result.untranslated = t.untranslated;
	return result;
}

function localizeField(field: FieldDef, t: Translator): LocalizedField {
	return clean({
		id: field.id,
		type: field.type,
		section: field.section,
		label: t.text(field.label),
		help: t.optional(field.help),
		placeholder: t.optional(field.placeholder),
		required: field.required,
		options: field.options?.map((option) => ({ value: option.value, label: t.text(option.label) })),
		default: field.default,
		showIf: field.show_if && { field: field.show_if.field, equals: field.show_if.equals },
		maxLength: field.max_length
	});
}

export function localizeLetter(letter: ResolvedLetterDef, locale: string): LocalizedLetter {
	const t = new Translator(locale);
	const result: LocalizedLetter = {
		id: letter.id,
		topic: letter.topic,
		title: t.text(letter.title),
		summary: t.text(letter.summary),
		fields: letter.fields.map((field) => localizeField(field, t)),
		params: Object.fromEntries(
			Object.entries(letter.params).map(([name, text]) => [name, text === null ? '' : t.text(text)])
		),
		computed: letter.computed,
		subject: t.text(letter.subject),
		body: t.text(letter.body),
		closing: t.text(letter.closing),
		deliveryTips: letter.delivery_tips.map((tip) => t.text(tip)),
		checklist: letter.checklist.map((item) => t.text(item)),
		citations: letter.citations.map((citation) => t.citation(citation)),
		untranslated: false
	};
	result.untranslated = t.untranslated;
	return result;
}
