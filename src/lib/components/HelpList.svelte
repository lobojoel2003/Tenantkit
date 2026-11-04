<script lang="ts">
	import type { LocalizedHelp } from '../engine/model.ts';
	import Icon from './Icon.svelte';

	let { help }: { help: LocalizedHelp[] } = $props();
	const tel = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
</script>

<ul class="grid help" style="--min: 17rem">
	{#each help as item (item.url + item.name)}
		<li class="card">
			<h3>
				<a href={item.url} rel="external noopener">{item.name} <Icon name="external" size={15} /></a
				>
			</h3>
			<p>{item.description}</p>
			{#if item.phone}
				<p class="phone">
					<Icon name="phone" size={16} /> <a href={tel(item.phone)}>{item.phone}</a>
				</p>
			{/if}
		</li>
	{/each}
</ul>

<style>
	.help h3 {
		font-size: 1.05rem;
	}

	.help p {
		margin-bottom: 0.5rem;
	}

	.phone {
		font-weight: 700;
	}
</style>
