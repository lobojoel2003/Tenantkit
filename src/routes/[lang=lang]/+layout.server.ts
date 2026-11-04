import { listJurisdictions } from '#lib/server/content.ts';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ params }) => ({
	locale: params.lang,
	jurisdictions: listJurisdictions(params.lang)
});
