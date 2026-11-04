<script lang="ts">
	import Breadcrumbs from '#lib/components/Breadcrumbs.svelte';
	import Citations from '#lib/components/Citations.svelte';
	import DeadlineCalculator from '#lib/components/DeadlineCalculator.svelte';
	import HelpList from '#lib/components/HelpList.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import ReviewStatus from '#lib/components/ReviewStatus.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { useI18n, type MessageKey } from '#lib/i18n/index.ts';
	import { paths } from '#lib/paths.ts';

	let { data } = $props();
	const i18n = useI18n();
	const j = $derived(data.jurisdiction);
	const d = $derived(data.deadline);
	const help = $derived(j.help.filter((item) => !item.topics || item.topics.includes(d.topic)));
</script>

<Seo title="{d.title} · {j.name}" description={d.summary} />

<div class="container">
	<Breadcrumbs
		items={[
			{ label: i18n.t('nav.home'), href: paths.home(i18n.locale) },
			{ label: j.name, href: paths.state(i18n.locale, j.id) },
			{
				label: i18n.t(`topic.${d.topic}.title` as MessageKey),
				href: paths.topic(i18n.locale, j.id, d.topic)
			},
			{ label: d.title }
		]}
	/>

	<div class="layout">
		<div class="main">
			<p class="tags">
				{#if d.urgent}<span class="badge urgent"
						><Icon name="alert" size={14} /> {i18n.t('badge.urgent')}</span
					>{/if}
				<span class="badge">{i18n.t(`kind.${d.kind}`)}</span>
				<span class="badge">{j.name}</span>
			</p>
			<h1>{d.title}</h1>
			<p class="lead">{d.summary}</p>
			{#if data.untranslated}<p class="notice info">{i18n.t('status.untranslated')}</p>{/if}

			<DeadlineCalculator deadline={d} jurisdiction={j} />

			<section aria-labelledby="meaning">
				<h2 id="meaning">{i18n.t('deadline.whatItMeans')}</h2>
				<p>{d.explanation}</p>
				{#if d.ifMissed}
					<h3>{i18n.t('deadline.ifMissed')}</h3>
					<p>{d.ifMissed}</p>
				{/if}
			</section>

			{#if d.steps.length > 0}
				<section aria-labelledby="steps">
					<h2 id="steps">{i18n.t('deadline.steps')}</h2>
					<ol class="steps">
						{#each d.steps as stepText, index (index)}<li>{stepText}</li>{/each}
					</ol>
				</section>
			{/if}

			{#if d.letters.length > 0}
				<section aria-labelledby="letters" class="no-print">
					<h2 id="letters">{i18n.t('deadline.letters')}</h2>
					<ul class="grid" style="--min: 16rem">
						{#each d.letters as letter (letter.id)}
							<li>
								<a class="card card-link" href={paths.letter(i18n.locale, j.id, letter.id)}>
									<h3><Icon name="letter" /> {letter.title}</h3>
								</a>
							</li>
						{/each}
					</ul>
				</section>
			{/if}

			<section aria-labelledby="law">
				<h2 id="law">{i18n.t('deadline.law')}</h2>
				<Citations citations={d.citations} />
				<ReviewStatus jurisdiction={j} />
				{#if data.sourceUrl}
					<p class="small no-print">
						<a href={data.sourceUrl} rel="external noopener">{i18n.t('state.edit')}</a>
					</p>
				{/if}
			</section>
		</div>

		{#if help.length > 0}
			<aside class="no-print" aria-labelledby="help">
				<h2 id="help">{i18n.t('state.helpTitle')}</h2>
				<HelpList {help} />
			</aside>
		{/if}
	</div>
</div>

<style>
	.layout {
		display: grid;
		gap: 2rem;
	}

	@media (min-width: 64rem) {
		.layout {
			grid-template-columns: minmax(0, 1fr) 20rem;
		}

		aside :global(.grid) {
			grid-template-columns: 1fr;
		}
	}

	.main {
		max-width: var(--reading);
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.75rem;
	}

	.steps li {
		margin-bottom: 0.6rem;
	}

	aside h2 {
		font-size: 1.2rem;
	}
</style>
