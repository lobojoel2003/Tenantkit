/**
 * Content schema for Tenantkit data files.
 *
 * Every YAML file under `content/` is validated against one of these schemas.
 * The same definitions generate the JSON Schemas in `schema/`, which give
 * editors autocompletion and inline errors while volunteers write content.
 */
import { z } from 'zod';

/** The content format version. Bump only for breaking changes to the format. */
export const SCHEMA_VERSION = 1;

const id = z
	.string()
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes (e.g. "repair-request")');

const fieldId = z
	.string()
	.regex(/^[a-z][a-z0-9_]*$/, 'Use lowercase letters, numbers and underscores (e.g. "move_out_date")');

const isoDate = z
	.string()
	.regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')
	.describe('A calendar date in YYYY-MM-DD format');

/**
 * Text in one or more languages. English (`en`) is required and is the
 * fallback when a translation is missing.
 */
export const Localized = z
	.object({ en: z.string().trim().min(1) })
	.catchall(z.string().trim().min(1))
	.describe('Text keyed by language code. "en" is required; add "es" and others as translations.');

export const Citation = z
	.object({
		label: z.string().min(1).describe('Short citation, e.g. "Cal. Civ. Code § 1950.5(g)"'),
		url: z.url({ protocol: /^https?$/ }).describe('Link to the official text of the law or rule'),
		note: Localized.optional()
	})
	.strict();

export const Topic = z.enum(['eviction', 'repairs', 'deposit']);

export const Period = z
	.object({
		amount: z.number().int().positive(),
		unit: z
			.enum(['calendar_days', 'court_days', 'months', 'hours'])
			.describe(
				'calendar_days counts every day; court_days skips weekends and the holidays listed for the jurisdiction; months adds calendar months (Jan 31 + 1 month = Feb 28); hours is rounded up to whole days'
			)
	})
	.strict();

const Weekday = z.enum(['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']);

export const HolidayDate = z.union([
	z
		.object({
			month: z.number().int().min(1).max(12),
			day: z.number().int().min(1).max(31),
			observed: z
				.enum(['none', 'nearest_weekday', 'sunday_to_monday'])
				.default('nearest_weekday')
				.describe(
					'What happens when the date falls on a weekend. nearest_weekday: Saturday moves to Friday, Sunday to Monday.'
				)
		})
		.strict(),
	z
		.object({
			month: z.number().int().min(1).max(12),
			weekday: Weekday,
			nth: z
				.number()
				.int()
				.min(-1)
				.max(5)
				.refine((n) => n !== 0, 'Use 1-5, or -1 for the last one in the month'),
			offset_days: z.number().int().min(-7).max(7).default(0)
		})
		.strict()
]);

export const Holiday = z
	.object({
		id,
		name: Localized,
		date: HolidayDate,
		since: z.number().int().min(1900).optional().describe('First year this holiday applies'),
		until: z.number().int().min(1900).optional().describe('Last year this holiday applies')
	})
	.strict();

export const HolidayCalendarFile = z
	.object({
		schema_version: z.literal(SCHEMA_VERSION),
		id,
		name: Localized,
		holidays: z.array(Holiday).min(1),
		sources: z.array(Citation).min(1)
	})
	.strict();

export const HolidayConfig = z
	.object({
		extends: z.array(id).default([]).describe('Holiday calendars to start from, e.g. ["us-federal"]'),
		add: z.array(Holiday).default([]),
		remove: z.array(id).default([]).describe('Holiday ids from the extended calendars that courts here do not close for'),
		note: Localized.optional(),
		sources: z.array(Citation).default([])
	})
	.strict();

export const HelpResource = z
	.object({
		name: z.string().min(1),
		url: z.url({ protocol: /^https?$/ }),
		phone: z.string().optional(),
		description: Localized,
		topics: z.array(Topic).optional()
	})
	.strict();

export const JurisdictionFile = z
	.object({
		schema_version: z.literal(SCHEMA_VERSION),
		id: z
			.string()
			.regex(/^[a-z]{2}(?:-[a-z0-9]+)*$/, 'Use a country code, then the state or city, e.g. "us-ca"'),
		name: Localized,
		short_name: z.string().min(1).max(12),
		country: z.string().regex(/^[A-Z]{2}$/),
		kind: z.enum(['general', 'state', 'county', 'city']),
		currency: z.string().regex(/^[A-Z]{3}$/).default('USD'),
		status: z
			.enum(['draft', 'reviewed'])
			.describe('draft: written by volunteers, not yet checked by a lawyer licensed here'),
		last_reviewed: isoDate.describe('When someone last checked these rules against the law'),
		reviewed_by: z.array(z.string()).default([]),
		maintainers: z.array(z.string()).default([]),
		summary: Localized,
		letters: z.array(id).default([]).describe('Letter ids offered here (local files override shared ones)'),
		holidays: HolidayConfig.optional(),
		help: z.array(HelpResource).default([]),
		sources: z.array(Citation).default([])
	})
	.strict();

export const DeadlineChoice = z
	.object({
		id,
		label: Localized,
		add_days: z
			.number()
			.int()
			.min(0)
			.default(0)
			.describe('Calendar days added to the start date before counting (e.g. service by mail)'),
		period: Period.optional().describe('Use a different period for this choice'),
		note: Localized.optional()
	})
	.strict();

export const Deadline = z
	.object({
		id,
		topic: Topic,
		kind: z
			.enum(['tenant_deadline', 'landlord_deadline', 'waiting_period', 'protection_period'])
			.describe(
				'tenant_deadline: you must act by this date. landlord_deadline: your landlord must act. waiting_period: the earliest date something can happen. protection_period: you are protected until this date.'
			),
		urgent: z.boolean().default(false),
		title: Localized,
		summary: Localized,
		trigger: Localized.describe('Label for the starting date, e.g. "The day you moved out"'),
		period: Period,
		extend_if_closed: z
			.boolean()
			.default(false)
			.describe('If the last day is a weekend or holiday, move it to the next court day'),
		options: z
			.object({
				id: fieldId,
				question: Localized,
				choices: z.array(DeadlineChoice).min(2)
			})
			.strict()
			.optional(),
		explanation: Localized,
		if_missed: Localized.optional(),
		steps: z.array(Localized).default([]),
		letters: z.array(id).default([]),
		citations: z.array(Citation).min(1)
	})
	.strict();

export const DeadlinesFile = z
	.object({
		schema_version: z.literal(SCHEMA_VERSION),
		deadlines: z.array(Deadline)
	})
	.strict();

export const FieldOption = z
	.object({
		value: fieldId,
		label: Localized
	})
	.strict();

export const Field = z
	.object({
		id: fieldId,
		type: z.enum(['text', 'textarea', 'date', 'money', 'number', 'email', 'tel', 'select', 'checkbox']),
		section: z.enum(['you', 'landlord', 'details', 'sending']).default('details'),
		label: Localized,
		help: Localized.optional(),
		placeholder: Localized.optional(),
		required: z.boolean().default(false),
		options: z.array(FieldOption).optional(),
		default: z.union([z.string(), z.boolean()]).optional().describe('Use "today" for date fields'),
		show_if: z
			.object({
				field: fieldId,
				equals: z.union([z.string(), z.boolean()]).default(true)
			})
			.strict()
			.optional(),
		max_length: z.number().int().positive().optional()
	})
	.strict();

export const FieldsetFile = z
	.object({
		schema_version: z.literal(SCHEMA_VERSION),
		id,
		fields: z.array(Field).min(1)
	})
	.strict();

export const Computed = z.union([
	z
		.object({
			from: z.union([fieldId, z.literal('today')]),
			add: Period
		})
		.strict(),
	z
		.object({
			from: fieldId,
			deadline: id.describe('A deadline id from the same jurisdiction')
		})
		.strict()
]);

export const LetterFile = z
	.object({
		schema_version: z.literal(SCHEMA_VERSION),
		id,
		extends: id.optional().describe('Start from a shared letter in content/letters/'),
		topic: Topic.optional(),
		title: Localized.optional(),
		summary: Localized.optional(),
		fieldsets: z.array(id).optional(),
		fields: z.array(Field).optional().describe('Extra fields, added after the fieldsets and any extended letter'),
		params: z
			.record(fieldId, Localized.nullable())
			.optional()
			.describe(
				'Named text blocks the body can insert with {{name}}. Shared letters can declare a block as null (empty) so each state can fill it in, e.g. with the state law.'
			),
		computed: z.record(fieldId, Computed).optional(),
		subject: Localized.optional(),
		body: Localized.optional(),
		closing: Localized.optional(),
		delivery_tips: z.array(Localized).optional(),
		checklist: z.array(Localized).optional(),
		citations: z.array(Citation).optional()
	})
	.strict();

export type LocalizedText = z.infer<typeof Localized>;
export type CitationDef = z.infer<typeof Citation>;
export type TopicId = z.infer<typeof Topic>;
export type PeriodDef = z.infer<typeof Period>;
export type HolidayDef = z.infer<typeof Holiday>;
export type HolidayDateDef = z.infer<typeof HolidayDate>;
export type HolidayCalendarDef = z.infer<typeof HolidayCalendarFile>;
export type HelpResourceDef = z.infer<typeof HelpResource>;
export type JurisdictionDef = z.infer<typeof JurisdictionFile>;
export type DeadlineDef = z.infer<typeof Deadline>;
export type DeadlineChoiceDef = z.infer<typeof DeadlineChoice>;
export type FieldDef = z.infer<typeof Field>;
export type FieldsetDef = z.infer<typeof FieldsetFile>;
export type ComputedDef = z.infer<typeof Computed>;
export type LetterFileDef = z.infer<typeof LetterFile>;

export const TOPICS = Topic.options;
