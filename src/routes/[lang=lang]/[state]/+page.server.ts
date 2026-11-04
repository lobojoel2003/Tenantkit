import { jurisdictionPage, stateEntries } from '#lib/server/content.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () => stateEntries();

export const load: PageServerLoad = ({ params }) => jurisdictionPage(params.state, params.lang);
