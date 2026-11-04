import { deadlineEntries, deadlinePage } from '#lib/server/content.ts';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = () => deadlineEntries();

export const load: PageServerLoad = ({ params }) =>
	deadlinePage(params.state, params.deadline, params.lang);
