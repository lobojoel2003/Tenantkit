/**
 * Loads content/ at build time. Every page is prerendered, so this only ever
 * runs on the build machine; browsers receive just the data each page needs.
 */
import { error } from '@sveltejs/kit';
import { formatIssue, loadContent, type ResolvedJurisdiction } from '../engine/loader.ts';
import {
	localizeDeadline,
	localizeJurisdiction,
	localizeLetter,
	summarizeJurisdiction
} from '../engine/localize.ts';
import type { JurisdictionSummary, LocalizedLetter } from '../engine/model.ts';
import type { TopicId } from '../engine/schema.ts';
import { LOCALE_CODES, type Locale } from '../i18n/config.ts';

const raw = import.meta.glob('/content/**/*.yaml', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const files = Object.fromEntries(
	Object.entries(raw).map(([path, text]) => [path.replace(/^\/content\//, ''), text])
);

const { bundle, issues } = loadContent(files, { locales: LOCALE_CODES });
const errors = issues.filter((issue) => issue.level === 'error');
if (errors.length > 0) {
	throw new Error(
		`Content has ${errors.length} error(s). Run "npm run content:validate" for details:\n` +
			errors.map(formatIssue).join('\n')
	);
}

export const REPOSITORY = 'https://github.com/lobojoel2003/Tenantkit';

export function contentUrl(file: string): string {
	return `${REPOSITORY}/blob/main/content/${file}`;
}

/** Alphabetical by name in the page's language, with "Other U.S. states" last. */
function compareJurisdictions(
	a: ResolvedJurisdiction,
	b: ResolvedJurisdiction,
	locale: Locale
): number {
	const general = Number(a.def.kind === 'general') - Number(b.def.kind === 'general');
	if (general !== 0) return general;
	return (a.def.name[locale] ?? a.def.name.en).localeCompare(
		b.def.name[locale] ?? b.def.name.en,
		locale
	);
}

export function jurisdictionIds(): string[] {
	return bundle.jurisdictions.map((jurisdiction) => jurisdiction.def.id);
}

export function listJurisdictions(locale: Locale): JurisdictionSummary[] {
	return [...bundle.jurisdictions]
		.sort((a, b) => compareJurisdictions(a, b, locale))
		.map((jurisdiction) => summarizeJurisdiction(jurisdiction, locale));
}

export function getJurisdiction(id: string): ResolvedJurisdiction {
	const jurisdiction = bundle.jurisdictions.find((candidate) => candidate.def.id === id);
	if (!jurisdiction) error(404, 'Not found');
	return jurisdiction;
}

export interface LetterSummary {
	id: string;
	topic: TopicId;
	title: string;
	summary: string;
}

export function jurisdictionPage(id: string, locale: Locale) {
	const jurisdiction = getJurisdiction(id);
	const deadlines = jurisdiction.deadlines.map((deadline) =>
		localizeDeadline(deadline, jurisdiction, locale)
	);
	const letters = jurisdiction.letters.map((letter) => localizeLetter(letter, locale));
	const localized = localizeJurisdiction(jurisdiction, locale);
	return {
		jurisdiction: localized,
		deadlines: deadlines.sort((a, b) => Number(b.urgent) - Number(a.urgent)),
		letters: letters.map((letter): LetterSummary => ({
			id: letter.id,
			topic: letter.topic,
			title: letter.title,
			summary: letter.summary
		})),
		untranslated:
			localized.untranslated ||
			deadlines.some((deadline) => deadline.untranslated) ||
			letters.some((letter) => letter.untranslated),
		files: jurisdiction.files.map((file) => ({ file, url: contentUrl(file) }))
	};
}

export function deadlinePage(id: string, deadlineId: string, locale: Locale) {
	const jurisdiction = getJurisdiction(id);
	const deadline = jurisdiction.deadlines.find((candidate) => candidate.id === deadlineId);
	if (!deadline) error(404, 'Not found');
	const localized = localizeDeadline(deadline, jurisdiction, locale);
	const file = jurisdiction.files.find((candidate) => candidate.endsWith('/deadlines.yaml'));
	return {
		jurisdiction: localizeJurisdiction(jurisdiction, locale),
		deadline: localized,
		untranslated: localized.untranslated,
		sourceUrl: file ? contentUrl(file) : null
	};
}

export function letterPage(id: string, letterId: string, locale: Locale) {
	const jurisdiction = getJurisdiction(id);
	const letter = jurisdiction.letters.find((candidate) => candidate.id === letterId);
	if (!letter) error(404, 'Not found');
	const variants: Partial<Record<Locale, LocalizedLetter>> = {};
	for (const code of LOCALE_CODES) {
		const variant = localizeLetter(letter, code);
		// Offer a letter language only when the letter is fully written in it.
		if (code === 'en' || !variant.untranslated) variants[code] = variant;
	}
	const localized = localizeLetter(letter, locale);
	const jurisdictionNames = Object.fromEntries(
		LOCALE_CODES.map((code) => [code, jurisdiction.def.name[code] ?? jurisdiction.def.name.en])
	) as Record<Locale, string>;
	return {
		jurisdiction: localizeJurisdiction(jurisdiction, locale),
		jurisdictionNames,
		letter: localized,
		variants,
		related: jurisdiction.deadlines
			.filter((deadline) => deadline.letters.includes(letter.id))
			.map((deadline) => {
				const item = localizeDeadline(deadline, jurisdiction, locale);
				return { id: item.id, title: item.title, kind: item.kind, urgent: item.urgent };
			}),
		untranslated: localized.untranslated,
		sourceUrl: contentUrl(letter.files.at(-1) ?? '')
	};
}

/** Every [lang, state] pair, for prerendering. */
export function stateEntries() {
	return LOCALE_CODES.flatMap((lang) => jurisdictionIds().map((state) => ({ lang, state })));
}

export function deadlineEntries() {
	return LOCALE_CODES.flatMap((lang) =>
		bundle.jurisdictions.flatMap((jurisdiction) =>
			jurisdiction.deadlines.map((deadline) => ({
				lang,
				state: jurisdiction.def.id,
				deadline: deadline.id
			}))
		)
	);
}

export function letterEntries() {
	return LOCALE_CODES.flatMap((lang) =>
		bundle.jurisdictions.flatMap((jurisdiction) =>
			jurisdiction.letters.map((letter) => ({
				lang,
				state: jurisdiction.def.id,
				letter: letter.id
			}))
		)
	);
}
