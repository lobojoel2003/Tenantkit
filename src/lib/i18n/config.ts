/**
 * Languages the site is offered in. To add one:
 *   1. copy src/lib/i18n/locales/en.json to <code>.json and translate it,
 *   2. add it below,
 *   3. add translations to the content files (missing ones fall back to English).
 */
export const LOCALES = [
	{ code: 'en', name: 'English', dir: 'ltr' },
	{ code: 'es', name: 'Español', dir: 'ltr' }
] as const;

export type Locale = (typeof LOCALES)[number]['code'];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_CODES: readonly Locale[] = LOCALES.map((locale) => locale.code);

export function isLocale(value: string | undefined): value is Locale {
	return value !== undefined && (LOCALE_CODES as readonly string[]).includes(value);
}

export function localeInfo(code: Locale) {
	return LOCALES.find((locale) => locale.code === code) ?? LOCALES[0];
}
