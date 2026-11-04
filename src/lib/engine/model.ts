/**
 * The shapes the app works with after content has been loaded, merged and
 * translated into one language. These are plain JSON-friendly objects, so
 * they can be sent from the build step to the browser as page data.
 */
import type { HolidayDef, PeriodDef, TopicId } from './schema.ts';

export interface LocalizedCitation {
	label: string;
	url: string;
	note?: string;
}

export interface LocalizedHelp {
	name: string;
	url: string;
	phone?: string;
	description: string;
	topics?: TopicId[];
}

export interface JurisdictionSummary {
	id: string;
	name: string;
	shortName: string;
	kind: 'general' | 'state' | 'county' | 'city';
	status: 'draft' | 'reviewed';
	lastReviewed: string;
	summary: string;
	topics: TopicId[];
	deadlineCount: number;
	letterCount: number;
}

export interface LocalizedJurisdiction extends JurisdictionSummary {
	country: string;
	currency: string;
	reviewedBy: string[];
	help: LocalizedHelp[];
	sources: LocalizedCitation[];
	holidayRules: HolidayDef[];
	holidayNote?: string;
	holidaySources: LocalizedCitation[];
	/** True when some text on this page is shown in English because it isn't translated yet. */
	untranslated: boolean;
}

export interface LocalizedChoice {
	id: string;
	label: string;
	addDays: number;
	period?: PeriodDef;
	note?: string;
}

export interface LocalizedDeadline {
	id: string;
	topic: TopicId;
	kind: 'tenant_deadline' | 'landlord_deadline' | 'waiting_period' | 'protection_period';
	urgent: boolean;
	title: string;
	summary: string;
	trigger: string;
	period: PeriodDef;
	extend_if_closed: boolean;
	options?: { id: string; question: string; choices: LocalizedChoice[] };
	explanation: string;
	ifMissed?: string;
	steps: string[];
	letters: { id: string; title: string }[];
	citations: LocalizedCitation[];
	untranslated: boolean;
}

export type FieldType =
	'text' | 'textarea' | 'date' | 'money' | 'number' | 'email' | 'tel' | 'select' | 'checkbox';

export type FieldSection = 'you' | 'landlord' | 'details' | 'sending';

export interface LocalizedField {
	id: string;
	type: FieldType;
	section: FieldSection;
	label: string;
	help?: string;
	placeholder?: string;
	required: boolean;
	options?: { value: string; label: string }[];
	default?: string | boolean;
	showIf?: { field: string; equals: string | boolean };
	maxLength?: number;
}

export interface ResolvedComputed {
	from: string;
	period: PeriodDef;
	addDays: number;
	extendIfClosed: boolean;
	/** Set when the date comes from a deadline rule. */
	deadline?: string;
}

export interface LocalizedLetter {
	id: string;
	topic: TopicId;
	title: string;
	summary: string;
	fields: LocalizedField[];
	params: Record<string, string>;
	computed: Record<string, ResolvedComputed>;
	subject: string;
	body: string;
	closing: string;
	deliveryTips: string[];
	checklist: string[];
	citations: LocalizedCitation[];
	untranslated: boolean;
}

/** Field ids the letter layout (sender, date, recipient, signature) relies on. */
export const FRAME_FIELDS = {
	tenantName: 'tenant_name',
	tenantAddress: 'tenant_address',
	rentalAddress: 'rental_address',
	tenantPhone: 'tenant_phone',
	tenantEmail: 'tenant_email',
	landlordName: 'landlord_name',
	landlordAddress: 'landlord_address',
	letterDate: 'letter_date',
	deliveryMethod: 'delivery_method'
} as const;

export const REQUIRED_FRAME_FIELDS = [
	FRAME_FIELDS.tenantName,
	FRAME_FIELDS.rentalAddress,
	FRAME_FIELDS.landlordName,
	FRAME_FIELDS.landlordAddress,
	FRAME_FIELDS.letterDate
] as const;

/** Names every letter template can use without declaring them. */
export const BUILTIN_NAMES = ['jurisdiction_name'] as const;
