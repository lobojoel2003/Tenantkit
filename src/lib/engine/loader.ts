/**
 * Loads the YAML files in `content/`, checks them, and merges them into a
 * bundle the app can use. Problems are reported with file names and line
 * numbers so volunteers can fix them without reading code.
 */
import { LineCounter, parseDocument, type Document } from 'yaml';
import type { z } from 'zod';
import { BUILTIN_NAMES, REQUIRED_FRAME_FIELDS, type ResolvedComputed } from './model.ts';
import { mergeHolidayRules } from './holidays.ts';
import {
	DeadlinesFile,
	FieldsetFile,
	HolidayCalendarFile,
	JurisdictionFile,
	LetterFile,
	type CitationDef,
	type DeadlineDef,
	type FieldDef,
	type FieldsetDef,
	type HolidayCalendarDef,
	type HolidayDef,
	type JurisdictionDef,
	type LetterFileDef,
	type LocalizedText,
	type TopicId
} from './schema.ts';
import { parseTemplate, templateNames, TemplateError } from './template.ts';

export type ContentFiles = Record<string, string>;

export interface ContentIssue {
	level: 'error' | 'warning';
	file: string;
	line?: number;
	path?: string;
	message: string;
}

export interface ResolvedLetterDef {
	id: string;
	topic: TopicId;
	title: LocalizedText;
	summary: LocalizedText;
	fields: FieldDef[];
	params: Record<string, LocalizedText | null>;
	computed: Record<string, ResolvedComputed>;
	subject: LocalizedText;
	body: LocalizedText;
	closing: LocalizedText;
	delivery_tips: LocalizedText[];
	checklist: LocalizedText[];
	citations: CitationDef[];
	/** Where this letter came from, for error messages and "edit this page" links. */
	files: string[];
}

export interface ResolvedJurisdiction {
	def: JurisdictionDef;
	deadlines: DeadlineDef[];
	letters: ResolvedLetterDef[];
	holidayRules: HolidayDef[];
	holidaySources: CitationDef[];
	files: string[];
}

export interface ContentBundle {
	jurisdictions: ResolvedJurisdiction[];
	fieldsets: Map<string, FieldsetDef>;
	calendars: Map<string, HolidayCalendarDef>;
	baseLetters: Map<string, LetterFileDef>;
}

export interface LoadOptions {
	/** Languages the site offers. Missing translations for these are warnings. */
	locales: readonly string[];
}

interface ParsedFile<T> {
	file: string;
	data: T;
	doc: Document;
	lines: LineCounter;
}

class Reporter {
	readonly issues: ContentIssue[] = [];

	add(
		level: ContentIssue['level'],
		file: string,
		message: string,
		path?: (string | number)[],
		source?: ParsedFile<unknown>
	) {
		const issue: ContentIssue = { level, file, message };
		if (path && path.length > 0) issue.path = formatPath(path);
		const line = source ? lineOf(source, path ?? []) : undefined;
		if (line !== undefined) issue.line = line;
		this.issues.push(issue);
	}

	error(file: string, message: string, path?: (string | number)[], source?: ParsedFile<unknown>) {
		this.add('error', file, message, path, source);
	}

	warn(file: string, message: string, path?: (string | number)[], source?: ParsedFile<unknown>) {
		this.add('warning', file, message, path, source);
	}
}

function formatPath(path: readonly (string | number | symbol)[]): string {
	return path
		.map((part, index) =>
			typeof part === 'number' ? `[${part}]` : index === 0 ? String(part) : `.${String(part)}`
		)
		.join('');
}

function lineOf(
	source: ParsedFile<unknown>,
	path: readonly (string | number)[]
): number | undefined {
	for (let length = path.length; length >= 0; length--) {
		const node = source.doc.getIn(path.slice(0, length), true) as
			{ range?: [number, number, number] } | undefined;
		const offset = node?.range?.[0];
		if (offset !== undefined) return source.lines.linePos(offset).line;
	}
	return undefined;
}

function parseFile<S extends z.ZodType>(
	file: string,
	text: string,
	schema: S,
	report: Reporter
): ParsedFile<z.infer<S>> | null {
	const lines = new LineCounter();
	const doc = parseDocument(text, { lineCounter: lines, prettyErrors: true, uniqueKeys: true });
	if (doc.errors.length > 0) {
		for (const error of doc.errors) {
			const issue: ContentIssue = {
				level: 'error',
				file,
				message: error.message.split('\n')[0] ?? error.message
			};
			const line = error.linePos?.[0]?.line;
			if (line !== undefined) issue.line = line;
			report.issues.push(issue);
		}
		return null;
	}
	const raw: unknown = doc.toJS();
	const result = schema.safeParse(raw);
	const parsedFile = { file, doc, lines, data: raw };
	if (!result.success) {
		for (const issue of result.error.issues) {
			report.error(
				file,
				friendlyMessage(issue.message),
				issue.path as (string | number)[],
				parsedFile
			);
		}
		return null;
	}
	return { ...parsedFile, data: result.data };
}

/** Add a hint for mistakes volunteers often make in YAML. */
function friendlyMessage(message: string): string {
	if (/expected string, received (number|boolean)/.test(message)) {
		return `${message}. Put the value in "quotes" so YAML reads it as text`;
	}
	if (/expected object, received string/.test(message)) {
		return `${message}. Translated text needs one line per language, e.g. "en: ..." and "es: ..."`;
	}
	return message;
}

function basename(file: string): string {
	return (
		file
			.split('/')
			.at(-1)
			?.replace(/\.ya?ml$/, '') ?? file
	);
}

/** Find every translated-text object in raw YAML data and check its languages. */
function checkTranslations(
	source: ParsedFile<unknown>,
	locales: readonly string[],
	report: Reporter
) {
	const walk = (value: unknown, path: (string | number)[]) => {
		if (Array.isArray(value)) {
			value.forEach((item, index) => walk(item, [...path, index]));
			return;
		}
		if (!value || typeof value !== 'object') return;
		const record = value as Record<string, unknown>;
		if (typeof record.en === 'string') {
			for (const locale of locales) {
				if (typeof record[locale] !== 'string') {
					report.warn(source.file, `Missing "${locale}" translation`, path, source);
				}
			}
			for (const key of Object.keys(record)) {
				if (!locales.includes(key)) {
					report.warn(
						source.file,
						`"${key}" is not one of the site's languages (${locales.join(', ')})`,
						[...path, key],
						source
					);
				}
			}
			return;
		}
		for (const [key, child] of Object.entries(record)) walk(child, [...path, key]);
	};
	walk(source.doc.toJS(), []);
}

function mergeFields(base: FieldDef[], extra: FieldDef[]): FieldDef[] {
	const result = [...base];
	for (const field of extra) {
		const index = result.findIndex((candidate) => candidate.id === field.id);
		if (index === -1) result.push(field);
		else result[index] = field;
	}
	return result;
}

function dedupeCitations(citations: CitationDef[]): CitationDef[] {
	const seen = new Set<string>();
	return citations.filter((citation) => {
		const key = `${citation.label}|${citation.url}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

interface LetterSource {
	parsed: ParsedFile<LetterFileDef>;
	base?: ParsedFile<LetterFileDef>;
}

function resolveLetter(
	source: LetterSource,
	jurisdiction: JurisdictionDef,
	deadlines: DeadlineDef[],
	fieldsets: Map<string, FieldsetDef>,
	report: Reporter
): ResolvedLetterDef | null {
	const own = source.parsed.data;
	const base = source.base?.data;
	const file = source.parsed.file;
	const files = [...(source.base ? [source.base.file] : []), file];

	const fieldsetIds = [...(base?.fieldsets ?? []), ...(own.fieldsets ?? [])].filter(
		(id, index, all) => all.indexOf(id) === index
	);
	let fields: FieldDef[] = [];
	for (const fieldsetId of fieldsetIds) {
		const fieldset = fieldsets.get(fieldsetId);
		if (!fieldset) {
			report.error(
				file,
				`Unknown fieldset "${fieldsetId}" (expected content/fieldsets/${fieldsetId}.yaml)`,
				['fieldsets']
			);
			return null;
		}
		fields = mergeFields(fields, fieldset.fields);
	}
	fields = mergeFields(mergeFields(fields, base?.fields ?? []), own.fields ?? []);

	const pick = <K extends keyof LetterFileDef>(key: K) => own[key] ?? base?.[key];
	const required = ['topic', 'title', 'summary', 'subject', 'body', 'closing'] as const;
	let complete = true;
	for (const key of required) {
		if (pick(key) === undefined) {
			report.error(file, `Missing "${key}" (set it here or in the letter it extends)`);
			complete = false;
		}
	}
	if (!complete) return null;

	const params = { ...(base?.params ?? {}), ...(own.params ?? {}) };
	const computedDefs = { ...(base?.computed ?? {}), ...(own.computed ?? {}) };
	const computed: Record<string, ResolvedComputed> = {};
	const fieldById = new Map(fields.map((field) => [field.id, field]));

	for (const [name, definition] of Object.entries(computedDefs)) {
		if (definition.from !== 'today' && fieldById.get(definition.from)?.type !== 'date') {
			report.error(
				file,
				`Computed "${name}" starts from "${definition.from}", which is not a date field`,
				['computed', name]
			);
			continue;
		}
		if ('deadline' in definition) {
			const rule = deadlines.find((deadline) => deadline.id === definition.deadline);
			if (!rule) {
				report.error(
					file,
					`Computed "${name}" uses deadline "${definition.deadline}", which ${jurisdiction.id} doesn't define`,
					['computed', name]
				);
				continue;
			}
			const choice = rule.options?.choices[0];
			computed[name] = {
				from: definition.from,
				period: choice?.period ?? rule.period,
				addDays: choice?.add_days ?? 0,
				extendIfClosed: rule.extend_if_closed,
				deadline: rule.id
			};
		} else {
			computed[name] = {
				from: definition.from,
				period: definition.add,
				addDays: 0,
				extendIfClosed: false
			};
		}
	}

	return {
		id: own.id,
		topic: pick('topic') as TopicId,
		title: pick('title') as LocalizedText,
		summary: pick('summary') as LocalizedText,
		fields,
		params,
		computed,
		subject: pick('subject') as LocalizedText,
		body: pick('body') as LocalizedText,
		closing: pick('closing') as LocalizedText,
		delivery_tips: own.delivery_tips ?? base?.delivery_tips ?? [],
		checklist: own.checklist ?? base?.checklist ?? [],
		citations: dedupeCitations([...(base?.citations ?? []), ...(own.citations ?? [])]),
		files
	};
}

function checkLetter(letter: ResolvedLetterDef, locales: readonly string[], report: Reporter) {
	const file = letter.files.at(-1) ?? letter.id;
	const fields = new Map(letter.fields.map((field) => [field.id, field]));

	for (const id of REQUIRED_FRAME_FIELDS) {
		if (!fields.has(id))
			report.error(
				file,
				`Letters need a "${id}" field (include the tenant, landlord and sending fieldsets)`
			);
	}

	for (const field of letter.fields) {
		if (field.type === 'select') {
			if (!field.options || field.options.length < 2)
				report.error(file, `Field "${field.id}" is a select and needs at least 2 options`);
			if (
				typeof field.default === 'string' &&
				!field.options?.some((option) => option.value === field.default)
			) {
				report.error(
					file,
					`Field "${field.id}" default "${field.default}" is not one of its options`
				);
			}
		} else if (field.options) {
			report.error(file, `Field "${field.id}" has options but is not a select`);
		}
		if (field.default === 'today' && field.type !== 'date')
			report.error(file, `Only date fields can default to "today" (field "${field.id}")`);
		if (typeof field.default === 'boolean' && field.type !== 'checkbox')
			report.error(file, `Field "${field.id}" has a yes/no default but is not a checkbox`);
		if (field.show_if) {
			const controller = fields.get(field.show_if.field);
			if (!controller)
				report.error(file, `Field "${field.id}" depends on unknown field "${field.show_if.field}"`);
			else if (typeof field.show_if.equals === 'boolean' && controller.type !== 'checkbox') {
				report.error(
					file,
					`Field "${field.id}" checks "${controller.id}" for yes/no, but it is not a checkbox`
				);
			} else if (
				typeof field.show_if.equals === 'string' &&
				!controller.options?.some((option) => option.value === field.show_if?.equals)
			) {
				report.error(
					file,
					`Field "${field.id}" checks "${controller.id}" for "${field.show_if.equals}", which is not one of its options`
				);
			}
		}
	}

	const names = new Set<string>([
		...fields.keys(),
		...Object.keys(letter.params),
		...Object.keys(letter.computed),
		...BUILTIN_NAMES
	]);
	for (const name of [...Object.keys(letter.params), ...Object.keys(letter.computed)]) {
		if (fields.has(name) || (BUILTIN_NAMES as readonly string[]).includes(name)) {
			report.error(file, `"${name}" is used both as a field and as a text block or computed date`);
		}
	}

	const templates: [string, LocalizedText][] = [
		['subject', letter.subject],
		['body', letter.body],
		...Object.entries(letter.params)
			.filter((entry): entry is [string, LocalizedText] => entry[1] !== null)
			.map(([name, text]): [string, LocalizedText] => [`params.${name}`, text])
	];
	for (const [where, text] of templates) {
		const namesByLocale = new Map<string, string>();
		for (const [locale, source] of Object.entries(text)) {
			let nodes;
			try {
				nodes = parseTemplate(source);
			} catch (error) {
				const message = error instanceof TemplateError ? error.message : String(error);
				report.error(file, `${where} (${locale}): ${message}`);
				continue;
			}
			const used = templateNames(nodes);
			for (const { name, compareValue } of used) {
				if (!names.has(name)) {
					report.error(
						file,
						`${where} (${locale}) uses {{${name}}}, but no field, text block or computed date has that name`
					);
					continue;
				}
				const field = fields.get(name);
				if (compareValue !== undefined) {
					if (field?.type !== 'select')
						report.error(
							file,
							`${where} (${locale}) compares "${name}" to "${compareValue}", but only select fields can be compared`
						);
					else if (!field.options?.some((option) => option.value === compareValue)) {
						report.error(
							file,
							`${where} (${locale}) compares "${name}" to "${compareValue}", which is not one of its options`
						);
					}
				}
			}
			for (const node of nodesOfType(nodes)) {
				if (fields.get(node)?.type === 'checkbox') {
					report.error(
						file,
						`${where} (${locale}) inserts checkbox "{{${node}}}" directly; use {{#if ${node}}} … {{/if}} instead`
					);
				}
			}
			namesByLocale.set(locale, [...new Set(used.map((entry) => entry.name))].sort().join(','));
		}
		const english = namesByLocale.get('en');
		for (const [locale, list] of namesByLocale) {
			if (
				locale !== 'en' &&
				english !== undefined &&
				list !== english &&
				locales.includes(locale)
			) {
				report.warn(
					file,
					`${where}: the "${locale}" translation uses different {{names}} than English (en: ${english || 'none'}; ${locale}: ${list || 'none'})`
				);
			}
		}
	}
}

function nodesOfType(nodes: ReturnType<typeof parseTemplate>): string[] {
	const names: string[] = [];
	const walk = (list: ReturnType<typeof parseTemplate>) => {
		for (const node of list) {
			if (node.type === 'var') names.push(node.name);
			else if (node.type === 'if') {
				walk(node.then);
				walk(node.otherwise);
			}
		}
	};
	walk(nodes);
	return names;
}

/** Parse, check and merge all content files. */
export function loadContent(
	files: ContentFiles,
	options: LoadOptions
): { bundle: ContentBundle; issues: ContentIssue[] } {
	const report = new Reporter();
	const fieldsets = new Map<string, FieldsetDef>();
	const calendars = new Map<string, HolidayCalendarDef>();
	const baseLetters = new Map<string, ParsedFile<LetterFileDef>>();
	const jurisdictionFiles = new Map<
		string,
		{
			meta?: ParsedFile<JurisdictionDef>;
			deadlines?: ParsedFile<z.infer<typeof DeadlinesFile>>;
			letters: ParsedFile<LetterFileDef>[];
		}
	>();
	const parsedAll: ParsedFile<unknown>[] = [];

	const entry = (dir: string) => {
		let value = jurisdictionFiles.get(dir);
		if (!value) {
			value = { letters: [] };
			jurisdictionFiles.set(dir, value);
		}
		return value;
	};

	const sorted = Object.keys(files).sort();
	for (const file of sorted) {
		const text = files[file] ?? '';
		if (!/\.ya?ml$/.test(file)) continue;
		if (file.endsWith('.yml')) report.warn(file, 'Use the .yaml extension');
		const parts = file.split('/');

		const checkId = <T extends { id: string }>(source: ParsedFile<T> | null, expected: string) => {
			if (source && source.data.id !== expected) {
				report.error(
					file,
					`id "${source.data.id}" must match the file or folder name "${expected}"`,
					['id'],
					source
				);
			}
			return source;
		};

		if (parts[0] === 'fieldsets' && parts.length === 2) {
			const source = checkId(parseFile(file, text, FieldsetFile, report), basename(file));
			if (source) {
				fieldsets.set(source.data.id, source.data);
				parsedAll.push(source);
			}
		} else if (parts[0] === 'holidays' && parts.length === 2) {
			const source = checkId(parseFile(file, text, HolidayCalendarFile, report), basename(file));
			if (source) {
				calendars.set(source.data.id, source.data);
				parsedAll.push(source);
			}
		} else if (parts[0] === 'letters' && parts.length === 2) {
			const source = checkId(parseFile(file, text, LetterFile, report), basename(file));
			if (source) {
				if (source.data.extends)
					report.error(file, 'Shared letters cannot extend other letters', ['extends'], source);
				baseLetters.set(source.data.id, source);
				parsedAll.push(source);
			}
		} else if (
			parts[0] === 'jurisdictions' &&
			parts.length === 3 &&
			parts[2] === 'jurisdiction.yaml'
		) {
			const dir = parts[1] ?? '';
			const source = checkId(parseFile(file, text, JurisdictionFile, report), dir);
			if (source) {
				entry(dir).meta = source;
				parsedAll.push(source);
			}
		} else if (
			parts[0] === 'jurisdictions' &&
			parts.length === 3 &&
			parts[2] === 'deadlines.yaml'
		) {
			const source = parseFile(file, text, DeadlinesFile, report);
			if (source) {
				entry(parts[1] ?? '').deadlines = source;
				parsedAll.push(source);
			}
		} else if (parts[0] === 'jurisdictions' && parts.length === 4 && parts[2] === 'letters') {
			const source = checkId(parseFile(file, text, LetterFile, report), basename(file));
			if (source) {
				entry(parts[1] ?? '').letters.push(source);
				parsedAll.push(source);
			}
		} else {
			report.warn(
				file,
				'This file is not in a place Tenantkit reads, so it is ignored (see content/README.md)'
			);
		}
	}

	for (const source of parsedAll) checkTranslations(source, options.locales, report);

	const jurisdictions: ResolvedJurisdiction[] = [];
	for (const [dir, group] of [...jurisdictionFiles].sort(([a], [b]) => a.localeCompare(b))) {
		const metaSource = group.meta;
		if (!metaSource) {
			report.error(
				`jurisdictions/${dir}/jurisdiction.yaml`,
				'Missing jurisdiction.yaml for this folder'
			);
			continue;
		}
		const def = metaSource.data;
		const file = metaSource.file;
		const deadlines = group.deadlines?.data.deadlines ?? [];
		const deadlineFile = group.deadlines?.file ?? file;

		// Holidays
		let holidayRules: HolidayDef[] = [];
		const holidaySources: CitationDef[] = [];
		if (def.holidays) {
			let base: HolidayDef[] = [];
			for (const calendarId of def.holidays.extends) {
				const calendar = calendars.get(calendarId);
				if (!calendar)
					report.error(
						file,
						`Unknown holiday calendar "${calendarId}" (expected content/holidays/${calendarId}.yaml)`,
						['holidays', 'extends'],
						metaSource
					);
				else {
					base = mergeHolidayRules(base, [], calendar.holidays);
					holidaySources.push(...calendar.sources);
				}
			}
			for (const removeId of def.holidays.remove) {
				if (!base.some((holiday) => holiday.id === removeId)) {
					report.error(
						file,
						`Can't remove holiday "${removeId}": it isn't in the extended calendars`,
						['holidays', 'remove'],
						metaSource
					);
				}
			}
			holidayRules = mergeHolidayRules(base, def.holidays.remove, def.holidays.add);
			holidaySources.push(...def.holidays.sources);
		}

		// Deadlines
		const deadlineIds = new Set<string>();
		deadlines.forEach((deadline, index) => {
			if (deadlineIds.has(deadline.id))
				report.error(
					deadlineFile,
					`Duplicate deadline id "${deadline.id}"`,
					['deadlines', index, 'id'],
					group.deadlines
				);
			deadlineIds.add(deadline.id);
			const usesCourtDays =
				deadline.period.unit === 'court_days' ||
				deadline.extend_if_closed ||
				deadline.options?.choices.some((choice) => choice.period?.unit === 'court_days');
			if (usesCourtDays && !def.holidays) {
				report.error(
					deadlineFile,
					`Deadline "${deadline.id}" counts court days, so jurisdiction.yaml needs a "holidays" section`,
					['deadlines', index],
					group.deadlines
				);
			}
			const choiceIds = new Set<string>();
			for (const choice of deadline.options?.choices ?? []) {
				if (choiceIds.has(choice.id))
					report.error(
						deadlineFile,
						`Duplicate choice id "${choice.id}" in deadline "${deadline.id}"`,
						['deadlines', index, 'options'],
						group.deadlines
					);
				choiceIds.add(choice.id);
			}
			deadline.letters.forEach((letterId, letterIndex) => {
				if (!def.letters.includes(letterId)) {
					report.error(
						deadlineFile,
						`Deadline "${deadline.id}" links to letter "${letterId}", which ${def.id} doesn't offer (add it to "letters" in jurisdiction.yaml)`,
						['deadlines', index, 'letters', letterIndex],
						group.deadlines
					);
				}
			});
		});

		// Letters
		const localLetters = new Map(group.letters.map((source) => [source.data.id, source]));
		for (const id of localLetters.keys()) {
			if (!def.letters.includes(id))
				report.warn(
					localLetters.get(id)?.file ?? file,
					`Letter "${id}" is not listed in jurisdiction.yaml "letters", so it won't be shown`
				);
		}
		const letters: ResolvedLetterDef[] = [];
		def.letters.forEach((letterId, index) => {
			const local = localLetters.get(letterId);
			const shared = baseLetters.get(letterId);
			let source: LetterSource | null = null;
			if (local) {
				if (local.data.extends) {
					const base = baseLetters.get(local.data.extends);
					if (!base)
						report.error(
							local.file,
							`Extends unknown shared letter "${local.data.extends}"`,
							['extends'],
							local
						);
					else source = { parsed: local, base };
				} else source = { parsed: local };
			} else if (shared) {
				source = { parsed: shared };
			} else {
				report.error(
					file,
					`Letter "${letterId}" not found in content/letters/ or jurisdictions/${dir}/letters/`,
					['letters', index],
					metaSource
				);
			}
			if (!source) return;
			const resolved = resolveLetter(source, def, deadlines, fieldsets, report);
			if (resolved) {
				checkLetter(resolved, options.locales, report);
				letters.push(resolved);
			}
		});

		jurisdictions.push({
			def,
			deadlines,
			letters,
			holidayRules,
			holidaySources: dedupeCitations(holidaySources),
			files: [
				file,
				...(group.deadlines ? [group.deadlines.file] : []),
				...group.letters.map((source) => source.file)
			]
		});
	}

	return {
		bundle: {
			jurisdictions,
			fieldsets,
			calendars,
			baseLetters: new Map([...baseLetters].map(([id, source]) => [id, source.data]))
		},
		issues: dedupeIssues(report.issues)
	};
}

/** Shared letters are checked once per jurisdiction that uses them; report each problem once. */
function dedupeIssues(issues: ContentIssue[]): ContentIssue[] {
	const seen = new Set<string>();
	return issues.filter((issue) => {
		const key = `${issue.level}|${issue.file}|${issue.line ?? ''}|${issue.path ?? ''}|${issue.message}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

export function formatIssue(issue: ContentIssue): string {
	const where = `content/${issue.file}${issue.line !== undefined ? `:${issue.line}` : ''}`;
	const path = issue.path ? ` (${issue.path})` : '';
	return `${issue.level === 'error' ? 'error' : 'warning'}  ${where}${path}  ${issue.message}`;
}
