import type { Handle } from '@sveltejs/kit/hooks';
import { DEFAULT_LOCALE, isLocale, localeInfo } from './lib/i18n/config.ts';

/** Set <html lang> and dir for each prerendered page. */
export const handle: Handle = async ({ event, resolve }) => {
	const lang = isLocale(event.params.lang) ? event.params.lang : DEFAULT_LOCALE;
	const { dir } = localeInfo(lang);
	return resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', lang).replace('%dir%', dir)
	});
};
