<script lang="ts">
	import Breadcrumbs from '#lib/components/Breadcrumbs.svelte';
	import HelpList from '#lib/components/HelpList.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import ReviewStatus from '#lib/components/ReviewStatus.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { useI18n, type MessageKey, type PluralKey } from '#lib/i18n/index.ts';
	import { paths } from '#lib/paths.ts';

	let { data } = $props();
	const i18n = useI18n();
	const j = $derived(data.jurisdiction);
	const title = $derived(i18n.t(`topic.${data.topic}.title` as MessageKey));
	const help = $derived(j.help.filter((item) => !item.topics || item.topics.includes(data.topic)));
</script>

<Seo
	title="{title} · {j.name}"
	description={i18n.t(`topic.${data.topic}.description` as MessageKey)}
/>

<div class="container">
	<Breadcrumbs
		items={[
			{ label: i18n.t('nav.home'), href: paths.home(i18n.locale) },
			{ label: j.name, href: paths.state(i18n.locale, j.id) },
			{ label: title }
		]}
	/>
	<h1><Icon name={data.topic} size={34} /> {title} <span class="muted">· {j.shortName}</span></h1>
	<p class="lead reading">{i18n.t(`topic.${data.topic}.description` as MessageKey)}</p>
	<ReviewStatus jurisdiction={j} />
	{#if data.untranslated}<p class="notice info">{i18n.t('status.untranslated')}</p>{/if}

	{#if data.deadlines.length > 0}
		<section aria-labelledby="deadlines">
			<h2 id="deadlines">{i18n.t('topicPage.deadlines')}</h2>
			<p class="muted">{i18n.t('topicPage.deadlinesLead')}</p>
			<ul class="list" data-testid="deadline-list">
				{#each data.deadlines as deadline (deadline.id)}
					<li>
						<a class="card card-link item" href={paths.deadline(i18n.locale, j.id, deadline.id)}>
							<span class="tags">
								{#if deadline.urgent}<span class="badge urgent"
										><Icon name="alert" size={14} /> {i18n.t('badge.urgent')}</span
									>{/if}
								<span class="badge">{i18n.t(`kind.${deadline.kind}`)}</span>
								<span class="badge"
									><Icon name="clock" size={14} />
									{i18n.tn(
										`unit.${deadline.period.unit}` as PluralKey,
										deadline.period.amount
									)}</span
								>
							</span>
							<h3>{deadline.title}</h3>
							<p>{deadline.summary}</p>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{:else if j.kind === 'general'}
		<p class="notice info">{i18n.t('state.noDeadlines')}</p>
	{/if}

	<section aria-labelledby="letters">
		<h2 id="letters">{i18n.t('topicPage.letters')}</h2>
		{#if data.letters.length > 0}
			<p class="muted">{i18n.t('topicPage.lettersLead')}</p>
			<ul class="list" data-testid="letter-list">
				{#each data.letters as letter (letter.id)}
					<li>
						<a class="card card-link item" href={paths.letter(i18n.locale, j.id, letter.id)}>
							<h3><Icon name="letter" /> {letter.title}</h3>
							<p>{letter.summary}</p>
						</a>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="muted">{i18n.t('topicPage.noLetters')}</p>
		{/if}
	</section>

	{#if help.length > 0}
		<section aria-labelledby="help">
			<h2 id="help">{i18n.t('state.helpTitle')}</h2>
			<HelpList {help} />
		</section>
	{/if}
</div>

<style>
	h1 {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
	}

	.list {
		display: grid;
		gap: 0.85rem;
		padding: 0;
		list-style: none;
		max-width: var(--reading);
	}

	.item h3 {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		margin: 0.4rem 0 0.25rem;
	}

	.item p {
		margin: 0;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
</style>
