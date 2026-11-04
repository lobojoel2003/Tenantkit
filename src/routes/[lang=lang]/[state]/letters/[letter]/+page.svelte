<script lang="ts">
	import Breadcrumbs from '#lib/components/Breadcrumbs.svelte';
	import Citations from '#lib/components/Citations.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import LetterWizard from '#lib/components/LetterWizard.svelte';
	import ReviewStatus from '#lib/components/ReviewStatus.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { useI18n, type MessageKey } from '#lib/i18n/index.ts';
	import { paths } from '#lib/paths.ts';

	let { data } = $props();
	const i18n = useI18n();
	const j = $derived(data.jurisdiction);
	const letter = $derived(data.letter);
</script>

<Seo title="{letter.title} · {j.name}" description={letter.summary} />

<div class="container">
	<div class="no-print">
		<Breadcrumbs
			items={[
				{ label: i18n.t('nav.home'), href: paths.home(i18n.locale) },
				{ label: j.name, href: paths.state(i18n.locale, j.id) },
				{
					label: i18n.t(`topic.${letter.topic}.title` as MessageKey),
					href: paths.topic(i18n.locale, j.id, letter.topic)
				},
				{ label: letter.title }
			]}
		/>
		<h1>{letter.title}</h1>
		<p class="lead reading">{letter.summary}</p>
		{#if data.untranslated}<p class="notice info">{i18n.t('status.untranslated')}</p>{/if}
	</div>

	<LetterWizard
		{letter}
		variants={data.variants}
		jurisdiction={j}
		jurisdictionNames={data.jurisdictionNames}
	/>

	<div class="after no-print reading">
		{#if data.related.length > 0}
			<section aria-labelledby="related">
				<h2 id="related">{i18n.t('letter.related')}</h2>
				<ul class="related">
					{#each data.related as deadline (deadline.id)}
						<li>
							<a href={paths.deadline(i18n.locale, j.id, deadline.id)}
								><Icon name="calendar" size={18} /> {deadline.title}</a
							>
							{#if deadline.urgent}<span class="badge urgent">{i18n.t('badge.urgent')}</span>{/if}
						</li>
					{/each}
				</ul>
			</section>
		{/if}
		{#if letter.citations.length > 0}
			<section aria-labelledby="law">
				<h2 id="law">{i18n.t('letter.law')}</h2>
				<Citations citations={letter.citations} />
			</section>
		{/if}
		<ReviewStatus jurisdiction={j} />
		<p class="small"><a href={data.sourceUrl} rel="external noopener">{i18n.t('state.edit')}</a></p>
	</div>
</div>

<style>
	.related {
		padding: 0;
		list-style: none;
	}

	.related li {
		display: flex;
		gap: 0.6rem;
		align-items: center;
		margin-bottom: 0.5rem;
		font-weight: 600;
	}

	.after {
		margin-top: 2rem;
	}
</style>
