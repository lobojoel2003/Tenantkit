/** Typed links to every page. All pages use a trailing slash (they're static index.html files). */
import { resolve } from '$app/paths';
import type { TopicId } from './engine/topics.ts';
import type { Locale } from './i18n/config.ts';

const slash = (path: string) => (path.endsWith('/') ? path : `${path}/`);

export const paths = {
	root: () => slash(resolve('/')),
	home: (lang: Locale) => slash(resolve('/[lang=lang]', { lang })),
	about: (lang: Locale) => slash(resolve('/[lang=lang]/about', { lang })),
	state: (lang: Locale, state: string) => slash(resolve('/[lang=lang]/[state]', { lang, state })),
	topic: (lang: Locale, state: string, topic: TopicId) =>
		slash(resolve('/[lang=lang]/[state]/[topic=topic]', { lang, state, topic })),
	deadline: (lang: Locale, state: string, deadline: string) =>
		slash(resolve('/[lang=lang]/[state]/deadlines/[deadline]', { lang, state, deadline })),
	letter: (lang: Locale, state: string, letter: string) =>
		slash(resolve('/[lang=lang]/[state]/letters/[letter]', { lang, state, letter }))
};

export const REPOSITORY = 'https://github.com/lobojoel2003/Tenantkit';
export const CONTENT_GUIDE = `${REPOSITORY}/blob/main/content/README.md`;
