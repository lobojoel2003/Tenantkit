<script lang="ts">
	import type { LocalizedCitation } from '../engine/model.ts';
	import Icon from './Icon.svelte';

	let { citations }: { citations: LocalizedCitation[] } = $props();
</script>

<ul class="citations">
	{#each citations as citation (citation.url + citation.label)}
		<li>
			<Icon name="law" size={16} />
			<span>
				<a href={citation.url} rel="external noopener">{citation.label}</a>
				{#if citation.note}<span class="muted"> — {citation.note}</span>{/if}
			</span>
		</li>
	{/each}
</ul>

<style>
	.citations {
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		gap: 0.5rem;
		align-items: baseline;
		margin-bottom: 0.4rem;
	}
</style>
