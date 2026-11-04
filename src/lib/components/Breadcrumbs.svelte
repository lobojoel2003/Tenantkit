<script lang="ts">
	import { useI18n } from '../i18n/index.ts';

	let { items }: { items: { label: string; href?: string }[] } = $props();
	const i18n = useI18n();
</script>

<nav aria-label={i18n.t('nav.breadcrumbs')} class="no-print">
	<ol>
		{#each items as item, index (index)}
			<li>
				{#if item.href && index < items.length - 1}
					<a href={item.href}>{item.label}</a>
				{:else}
					<span aria-current="page">{item.label}</span>
				{/if}
			</li>
		{/each}
	</ol>
</nav>

<style>
	nav {
		margin-block: 1.25rem 0.5rem;
		font-size: 0.95rem;
	}

	ol {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li:not(:last-child)::after {
		content: '›';
		margin-inline-start: 0.4rem;
		color: var(--muted);
	}

	span {
		color: var(--muted);
	}
</style>
