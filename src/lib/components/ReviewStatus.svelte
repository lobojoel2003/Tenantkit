<script lang="ts">
	import type { LocalizedJurisdiction } from '../engine/model.ts';
	import { useI18n } from '../i18n/index.ts';
	import Icon from './Icon.svelte';

	let {
		jurisdiction,
		compact = false
	}: {
		jurisdiction: Pick<LocalizedJurisdiction, 'status' | 'lastReviewed' | 'reviewedBy'>;
		compact?: boolean;
	} = $props();
	const i18n = useI18n();
</script>

{#if compact}
	<span class="badge {jurisdiction.status}">
		<Icon name={jurisdiction.status === 'reviewed' ? 'check' : 'clock'} size={14} />
		{i18n.t(jurisdiction.status === 'reviewed' ? 'status.reviewed' : 'status.draft')}
	</span>
{:else}
	<div
		class="notice {jurisdiction.status === 'reviewed' ? 'info' : 'warning'} review"
		data-testid="review-status"
	>
		<p>
			<span class="badge {jurisdiction.status}">
				<Icon name={jurisdiction.status === 'reviewed' ? 'check' : 'clock'} size={14} />
				{i18n.t(jurisdiction.status === 'reviewed' ? 'status.reviewed' : 'status.draft')}
			</span>
			{jurisdiction.status === 'reviewed'
				? i18n.t('status.reviewedLong', { reviewers: jurisdiction.reviewedBy.join(', ') })
				: i18n.t('status.draftLong')}
			<span class="muted"
				>{i18n.t('status.lastChecked', { date: i18n.date(jurisdiction.lastReviewed) })}</span
			>
		</p>
	</div>
{/if}

<style>
	.review p {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 0.6rem;
		align-items: baseline;
		margin: 0;
	}
</style>
