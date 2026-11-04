import { LOCALE_CODES } from '#lib/i18n/config.ts';
import { jurisdictionPage, listJurisdictions } from '#lib/server/content.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () =>
	LOCALE_CODES.flatMap((lang) =>
		listJurisdictions(lang).flatMap((jurisdiction) =>
			jurisdiction.topics.map((topic) => ({ lang, state: jurisdiction.id, topic }))
		)
	);

export const load: PageServerLoad = ({ params }) => {
	const page = jurisdictionPage(params.state, params.lang);
	return {
		topic: params.topic,
		jurisdiction: page.jurisdiction,
		deadlines: page.deadlines.filter((deadline) => deadline.topic === params.topic),
		letters: page.letters.filter((letter) => letter.topic === params.topic),
		untranslated: page.untranslated
	};
};
