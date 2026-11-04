/**
 * Interface text. Content text (rules and letters) is translated in the YAML
 * files instead; see content/README.md.
 */
import { getContext, setContext } from 'svelte';
import { formatDate, type DateStyle, type ISODate } from '../engine/civil-date.ts';
import { DEFAULT_LOCALE, type Locale } from './config.ts';
import en from './locales/en.json';
import es from './locales/es.json';

export type MessageKey = keyof typeof en;
type PluralBase<K> = K extends `${infer Base}.other` ? Base : never;
export type PluralKey = PluralBase<MessageKey>;
export type Params = Record<string, string | number>;

const catalogs: Record<Locale, Partial<Record<MessageKey, string>>> = { en, es };

function interpolate(template: string, params?: Params): string {
	if (!params) return template;
	return template.replace(/\{(\w+)\}/g, (match, name: string) =>
		name in params ? String(params[name]) : match
	);
}

export function translate(locale: Locale, key: MessageKey, params?: Params): string {
	const template = catalogs[locale][key] ?? catalogs[DEFAULT_LOCALE][key] ?? key;
	return interpolate(template, params);
}

export function translatePlural(
	locale: Locale,
	key: PluralKey,
	count: number,
	params?: Params
): string {
	const rule = new Intl.PluralRules(locale).select(count);
	const specific = `${key}.${rule}` as MessageKey;
	const chosen =
		specific in catalogs[locale] || specific in catalogs[DEFAULT_LOCALE]
			? specific
			: (`${key}.other` as MessageKey);
	return translate(locale, chosen, {
		count: new Intl.NumberFormat(locale).format(count),
		...params
	});
}

export interface I18n {
	readonly locale: Locale;
	t(key: MessageKey, params?: Params): string;
	tn(key: PluralKey, count: number, params?: Params): string;
	date(value: ISODate, style?: DateStyle): string;
}

export function createI18n(getLocale: () => Locale): I18n {
	return {
		get locale() {
			return getLocale();
		},
		t: (key, params) => translate(getLocale(), key, params),
		tn: (key, count, params) => translatePlural(getLocale(), key, count, params),
		date: (value, style = 'long') => formatDate(value, getLocale(), style)
	};
}

const KEY = Symbol('tenantkit.i18n');

export function provideI18n(i18n: I18n): void {
	setContext(KEY, i18n);
}

export function useI18n(): I18n {
	const i18n = getContext<I18n | undefined>(KEY);
	if (!i18n) throw new Error('useI18n() must be used inside a [lang] layout');
	return i18n;
}
