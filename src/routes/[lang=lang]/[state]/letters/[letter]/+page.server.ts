import { letterEntries, letterPage } from '#lib/server/content.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () => letterEntries();

export const load: PageServerLoad = ({ params }) =>
	letterPage(params.state, params.letter, params.lang);
