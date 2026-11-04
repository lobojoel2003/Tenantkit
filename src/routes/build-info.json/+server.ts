import { json } from '@sveltejs/kit';
import { listJurisdictions } from '#lib/server/content.ts';

export const prerender = true;

/** Machine-readable build metadata: /build-info.json */
export function GET() {
	return json({
		name: 'tenantkit',
		...__TENANTKIT_BUILD__,
		jurisdictions: listJurisdictions('en').map(
			({ id, status, lastReviewed, deadlineCount, letterCount }) => ({
				id,
				status,
				lastReviewed,
				deadlines: deadlineCount,
				letters: letterCount
			})
		)
	});
}
