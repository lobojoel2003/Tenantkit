<script lang="ts">
	import Breadcrumbs from '#lib/components/Breadcrumbs.svelte';
	import Citations from '#lib/components/Citations.svelte';
	import HelpList from '#lib/components/HelpList.svelte';
	import Icon from '#lib/components/Icon.svelte';
	import ReviewStatus from '#lib/components/ReviewStatus.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { yearOf, todayISO } from '#lib/engine/civil-date.ts';
	import { HolidayCalendar } from '#lib/engine/holidays.ts';
	import { TOPICS, type TopicId } from '#lib/engine/topics.ts';
	import { useI18n, type MessageKey } from '#lib/i18n/index.ts';
	import { paths, REPOSITORY } from '#lib/paths.ts';

	let { data } = $props();
	const i18n = useI18n();
	const j = $derived(data.jurisdiction);
	const year = yearOf(todayISO());
	const holidays = $derived(
		j.holidayRules.length > 0 ? new HolidayCalendar(j.holidayRules).list(year) : []
	);
	const count = (topic: TopicId) => ({
		deadlines: data.deadlines.filter((deadline) => deadline.topic === topic).length,
		letters: data.letters.filter((letter) => letter.topic === topic).length
	});
	const issueUrl = $derived(
		`${REPOSITORY}/issues/new?template=content-correction.yml&title=${encodeURIComponent(`[${j.id}] `)}`
	);
</script>

<Seo title={j.name} description={j.summary} />

<div class="container">
	<Breadcrumbs
		items={[{ label: i18n.t('nav.home'), href: paths.home(i18n.locale) }, { label: j.name }]}
	/>
	<h1>{j.name}</h1>
	<p class="lead reading">{j.summary}</p>
	<ReviewStatus jurisdiction={j} />
	{#if data.untranslated}<p class="notice info">{i18n.t('status.untranslated')}</p>{/if}

	<section aria-labelledby="topics">
		<h2 id="topics">{i18n.t('state.topicsTitle')}</h2>
		<ul class="grid topics" style="--min: 17rem">
			{#each TOPICS.filter((topic) => j.topics.includes(topic)) as topic (topic)}
				{@const counts = count(topic)}
				<li>
					<a
						class="card card-link topic"
						href={paths.topic(i18n.locale, j.id, topic)}
						data-testid="topic-{topic}"
					>
						<span class="icon"><Icon name={topic} size={26} /></span>
						<h3>{i18n.t(`topic.${topic}.title` as MessageKey)}</h3>
						<p>{i18n.t(`topic.${topic}.description` as MessageKey)}</p>
						<p class="meta">
							{#if counts.deadlines > 0}{i18n.tn(
									'state.deadlineCount',
									counts.deadlines
								)}&nbsp;·&nbsp;{/if}{i18n.tn('state.letterCount', counts.letters)}
						</p>
					</a>
				</li>
			{/each}
		</ul>
		{#if data.deadlines.length === 0}<p class="notice info">{i18n.t('state.noDeadlines')}</p>{/if}
	</section>

	{#if j.help.length > 0}
		<section aria-labelledby="help">
			<h2 id="help">{i18n.t('state.helpTitle')}</h2>
			<HelpList help={j.help} />
		</section>
	{/if}

	<section aria-labelledby="rules" class="reading">
		<h2 id="rules">{i18n.t('state.aboutRules')}</h2>
		{#if holidays.length > 0}
			<h3>{i18n.t('state.holidaysTitle', { year })}</h3>
			{#if j.holidayNote}<p>{j.holidayNote}</p>{/if}
			<ul class="holidays" data-testid="holiday-list">
				{#each holidays as holiday (holiday.id + holiday.date)}
					<li>
						<strong>{i18n.date(holiday.date, 'medium')}</strong>
						{holiday.name[i18n.locale] ?? holiday.name.en}
						{#if holiday.actual}<span class="muted small"
								>{i18n.t('state.holidaysObserved', {
									date: i18n.date(holiday.actual, 'medium')
								})}</span
							>{/if}
					</li>
				{/each}
			</ul>
			{#if j.holidaySources.length > 0}<Citations citations={j.holidaySources} />{/if}
		{/if}
		{#if j.sources.length > 0}
			<h3>{i18n.t('state.sources')}</h3>
			<Citations citations={j.sources} />
		{/if}
		<p class="button-row">
			<a class="button secondary" href={issueUrl} rel="external noopener"
				>{i18n.t('state.suggest')}</a
			>
			<a href={data.files[0]?.url.replace(/\/[^/]+$/, '')} rel="external noopener"
				>{i18n.t('state.edit')}</a
			>
		</p>
	</section>
</div>

<style>
	.topic {
		height: 100%;
	}

	.topic .icon {
		display: inline-grid;
		place-items: center;
		width: 3rem;
		height: 3rem;
		border-radius: 0.8rem;
		background: var(--primary-soft);
		color: var(--primary);
		margin-bottom: 0.5rem;
	}

	.topic p {
		margin-bottom: 0.4rem;
	}

	.meta {
		color: var(--muted);
		font-size: 0.92rem;
	}

	.holidays {
		columns: 2 16rem;
		padding-inline-start: 1.1rem;
	}

	.holidays li {
		break-inside: avoid;
		margin-bottom: 0.25rem;
	}
</style>
