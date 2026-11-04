import { describe, expect, it } from 'vitest';
import { readContentFiles } from '../../scripts/content-files.ts';
import { HolidayCalendar } from '../../src/lib/engine/holidays.ts';
import { computeRule } from '../../src/lib/engine/deadlines.ts';
import { initialValues, letterToText, renderLetter } from '../../src/lib/engine/letters.ts';
import { formatIssue, loadContent, type ContentFiles } from '../../src/lib/engine/loader.ts';
import {
	localizeDeadline,
	localizeJurisdiction,
	localizeLetter
} from '../../src/lib/engine/localize.ts';
import { LOCALE_CODES } from '../../src/lib/i18n/config.ts';

const files = readContentFiles();
const { bundle, issues } = loadContent(files, { locales: LOCALE_CODES });

describe('the shipped content', () => {
	it('has no errors or warnings', () => {
		expect(issues.map(formatIssue)).toEqual([]);
	});

	it('covers several jurisdictions, with "other states" as a fallback', () => {
		const ids = bundle.jurisdictions.map((jurisdiction) => jurisdiction.def.id);
		expect(ids).toContain('us-general');
		expect(ids.length).toBeGreaterThanOrEqual(6);
	});

	for (const jurisdiction of bundle.jurisdictions) {
		describe(jurisdiction.def.id, () => {
			const calendar = new HolidayCalendar(jurisdiction.holidayRules);

			it('computes every deadline and every choice', () => {
				for (const deadline of jurisdiction.deadlines) {
					const localized = localizeDeadline(deadline, jurisdiction, 'en');
					for (const choice of localized.options?.choices ?? [{ id: undefined }]) {
						const result = computeRule(localized, '2026-11-20', calendar, choice.id);
						expect(result.due > '2026-11-20', `${deadline.id}/${choice.id}`).toBe(true);
					}
					expect(localized.citations.length).toBeGreaterThan(0);
				}
			});

			it('renders every letter in every language without unknown names', () => {
				const name = localizeJurisdiction(jurisdiction, 'en').name;
				for (const letter of jurisdiction.letters) {
					for (const locale of LOCALE_CODES) {
						const localized = localizeLetter(letter, locale);
						expect(localized.untranslated, `${letter.id} (${locale})`).toBe(false);
						const values = { ...initialValues(localized, '2026-11-04') };
						for (const field of localized.fields) {
							if (values[field.id] !== undefined) continue;
							if (field.type === 'date') values[field.id] = '2026-10-01';
							else if (field.type === 'money') values[field.id] = '1500';
							else if (field.type === 'checkbox') values[field.id] = true;
							else if (field.type === 'select') values[field.id] = field.options?.[0]?.value ?? '';
							else if (field.type === 'email') values[field.id] = 'tenant@example.org';
							else values[field.id] = `Sample ${field.id}`;
						}
						const text = letterToText(
							renderLetter(localized, values, {
								locale,
								calendar,
								currency: 'USD',
								region: 'US',
								jurisdictionName: name,
								today: '2026-11-04'
							})
						);
						expect(text, `${letter.id} (${locale})`).not.toMatch(/\[[a-z_]+\]/);
						expect(text.length).toBeGreaterThan(300);
					}
				}
			});
		});
	}
});

describe('the content checker', () => {
	const base: ContentFiles = Object.fromEntries(
		Object.entries(files).filter(
			([path]) => !path.startsWith('jurisdictions/') || path.startsWith('jurisdictions/us-general/')
		)
	);
	const check = (extra: ContentFiles) =>
		loadContent({ ...base, ...extra }, { locales: LOCALE_CODES }).issues;

	it('reports YAML syntax errors with a line number', () => {
		const found = check({
			'jurisdictions/us-zz/jurisdiction.yaml': 'schema_version: 1\nid: [unclosed\n'
		});
		expect(
			found.some(
				(issue) =>
					issue.level === 'error' &&
					issue.file === 'jurisdictions/us-zz/jurisdiction.yaml' &&
					issue.line !== undefined
			)
		).toBe(true);
	});

	it('requires ids to match folder names', () => {
		const text =
			files['jurisdictions/us-general/jurisdiction.yaml']?.replace(
				'id: us-general',
				'id: us-other'
			) ?? '';
		const found = check({ 'jurisdictions/us-general/jurisdiction.yaml': text });
		expect(found.map((issue) => issue.message).join('\n')).toMatch(
			/must match the file or folder name/
		);
	});

	it('explains values YAML reads as numbers', () => {
		const text =
			files['jurisdictions/us-general/jurisdiction.yaml']?.replace(
				'short_name: US',
				'short_name: 12'
			) ?? '';
		const found = check({ 'jurisdictions/us-general/jurisdiction.yaml': text });
		expect(found.find((issue) => issue.path === 'short_name')?.message).toMatch(
			/Put the value in "quotes"/
		);
	});

	it('catches unknown template names, bad comparisons and missing translations', () => {
		const letter = [
			'schema_version: 1',
			'id: repair-request',
			'extends: repair-request',
			'params:',
			'  law:',
			'    en: "See {{no_such_field}}. {{#if urgent == \\"x\\"}}x{{/if}}"',
			''
		].join('\n');
		const found = check({ 'jurisdictions/us-general/letters/repair-request.yaml': letter });
		const messages = found.map((issue) => `${issue.level}: ${issue.message}`).join('\n');
		expect(messages).toMatch(/error: .*no_such_field/);
		expect(messages).toMatch(/error: .*only select fields can be compared/);
		expect(messages).toMatch(/warning: Missing "es" translation/);
	});

	it('catches references to deadlines and letters that do not exist', () => {
		const jurisdiction = files['jurisdictions/us-general/jurisdiction.yaml'] ?? '';
		const deadlines = [
			'schema_version: 1',
			'deadlines:',
			'  - id: test',
			'    topic: deposit',
			'    kind: landlord_deadline',
			'    title: { en: T, es: T }',
			'    summary: { en: S, es: S }',
			'    trigger: { en: D, es: D }',
			'    period: { amount: 3, unit: court_days }',
			'    explanation: { en: E, es: E }',
			'    letters: [missing-letter]',
			'    citations: [{ label: X, url: "https://example.org" }]',
			''
		].join('\n');
		const found = check({
			'jurisdictions/us-general/jurisdiction.yaml': jurisdiction,
			'jurisdictions/us-general/deadlines.yaml': deadlines
		});
		const messages = found.map((issue) => issue.message).join('\n');
		expect(messages).toMatch(/links to letter "missing-letter"/);
		expect(messages).toMatch(/needs a "holidays" section/);
	});

	it('warns about files in places it does not read', () => {
		expect(
			check({ 'stray.yaml': 'a: 1' }).some(
				(issue) => issue.level === 'warning' && issue.file === 'stray.yaml'
			)
		).toBe(true);
	});
});
