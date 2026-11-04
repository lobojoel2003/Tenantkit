import { describe, expect, it } from 'vitest';
import { LOCALE_CODES } from '../../src/lib/i18n/config.ts';
import { translate, translatePlural } from '../../src/lib/i18n/index.ts';
import en from '../../src/lib/i18n/locales/en.json';
import es from '../../src/lib/i18n/locales/es.json';

const catalogs: Record<string, Record<string, string>> = { en, es };
const placeholders = (text: string) =>
	[...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe('interface translations', () => {
	it('has a catalog for every site language', () => {
		for (const code of LOCALE_CODES) expect(catalogs[code], code).toBeDefined();
	});

	for (const code of LOCALE_CODES.filter((locale) => locale !== 'en')) {
		it(`${code} has exactly the same keys as English`, () => {
			const catalog = catalogs[code] ?? {};
			expect(Object.keys(catalog).sort()).toEqual(Object.keys(en).sort());
		});

		it(`${code} uses the same {placeholders} as English`, () => {
			const catalog = catalogs[code] ?? {};
			for (const [key, text] of Object.entries(en)) {
				expect(placeholders(catalog[key] ?? ''), key).toEqual(placeholders(text));
			}
		});
	}

	it('has no empty strings', () => {
		for (const [code, catalog] of Object.entries(catalogs)) {
			for (const [key, text] of Object.entries(catalog))
				expect(text.trim(), `${code}:${key}`).not.toBe('');
		}
	});

	it('interpolates and pluralizes', () => {
		expect(translate('en', 'status.lastChecked', { date: 'May 1' })).toBe('Last checked May 1');
		expect(translatePlural('en', 'deadline.fromToday', 1)).toBe("That's 1 day from today.");
		expect(translatePlural('en', 'deadline.fromToday', 1200)).toBe("That's 1,200 days from today.");
		expect(translatePlural('es', 'deadline.fromToday', 3)).toBe('Faltan 3 días.');
	});
});
