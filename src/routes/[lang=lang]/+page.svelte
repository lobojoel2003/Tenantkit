<script lang="ts">
	import Icon from '#lib/components/Icon.svelte';
	import ReviewStatus from '#lib/components/ReviewStatus.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { useI18n } from '#lib/i18n/index.ts';
	import { paths } from '#lib/paths.ts';

	let { data } = $props();
	const i18n = useI18n();

	let query = $state('');
	const normalize = (text: string) => text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
	const general = $derived(
		data.jurisdictions.find((jurisdiction) => jurisdiction.kind === 'general')
	);
	const shown = $derived(
		query.trim() === ''
			? data.jurisdictions
			: data.jurisdictions.filter(
					(jurisdiction) =>
						normalize(jurisdiction.name).includes(normalize(query.trim())) ||
						normalize(jurisdiction.shortName) === normalize(query.trim()) ||
						jurisdiction.kind === 'general'
				)
	);
</script>

<Seo />

<div class="hero">
	<div class="container">
		<h1>{i18n.t('home.title')}</h1>
		<p class="lead">{i18n.t('home.lead')}</p>
		<p class="privacy"><Icon name="lock" size={18} /> {i18n.t('home.privacy')}</p>
	</div>
</div>

<div class="container">
	<div class="notice danger urgent">
		<h2><Icon name="alert" /> {i18n.t('home.urgentTitle')}</h2>
		<p>{i18n.t('home.urgentText')}</p>
	</div>

	<section aria-labelledby="pick-state">
		<div class="pick-header">
			<h2 id="pick-state">{i18n.t('home.pickState')}</h2>
			{#if data.jurisdictions.length > 8}
				<label class="filter">
					<span class="visually-hidden">{i18n.t('home.filterStates')}</span>
					<input
						type="search"
						bind:value={query}
						placeholder={i18n.t('home.filterStates')}
						autocomplete="off"
					/>
				</label>
			{/if}
		</div>
		<ul class="grid states" style="--min: 15rem" data-testid="state-list">
			{#each shown as jurisdiction (jurisdiction.id)}
				<li>
					<a
						class="card card-link state"
						class:general={jurisdiction.kind === 'general'}
						href={paths.state(i18n.locale, jurisdiction.id)}
					>
						<span class="code" aria-hidden="true">{jurisdiction.shortName}</span>
						<span class="body">
							<h3>{jurisdiction.name}</h3>
							<span class="meta">
								{#if jurisdiction.deadlineCount > 0}{i18n.tn(
										'state.deadlineCount',
										jurisdiction.deadlineCount
									)}&nbsp;·&nbsp;{/if}{i18n.tn('state.letterCount', jurisdiction.letterCount)}
							</span>
							<ReviewStatus jurisdiction={{ ...jurisdiction, reviewedBy: [] }} compact />
						</span>
					</a>
				</li>
			{/each}
		</ul>
		{#if shown.length === 1 && general && query.trim() !== ''}
			<p class="muted">{i18n.t('home.noMatch', { general: general.name })}</p>
		{/if}
	</section>

	<section aria-labelledby="how">
		<h2 id="how">{i18n.t('home.howTitle')}</h2>
		<ol class="grid how" style="--min: 15rem">
			<li class="card">
				<Icon name="globe" size={28} />
				<h3>{i18n.t('home.how1.title')}</h3>
				<p>{i18n.t('home.how1.text')}</p>
			</li>
			<li class="card">
				<Icon name="calendar" size={28} />
				<h3>{i18n.t('home.how2.title')}</h3>
				<p>{i18n.t('home.how2.text')}</p>
			</li>
			<li class="card">
				<Icon name="letter" size={28} />
				<h3>{i18n.t('home.how3.title')}</h3>
				<p>{i18n.t('home.how3.text')}</p>
			</li>
		</ol>
		<ul class="trust">
			<li><Icon name="code" /> {i18n.t('home.trust1')}</li>
			<li><Icon name="law" /> {i18n.t('home.trust2')}</li>
			<li><Icon name="shield" /> {i18n.t('home.trust3')}</li>
		</ul>
	</section>
</div>

<style>
	.hero {
		background: linear-gradient(180deg, var(--primary-soft), transparent);
		padding-block: clamp(2rem, 6vw, 4.5rem) 1.5rem;
	}

	.hero h1 {
		max-width: 22ch;
	}

	.hero .lead {
		max-width: 40rem;
	}

	.privacy {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		font-weight: 600;
	}

	.urgent h2 {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		font-size: 1.2rem;
		margin-bottom: 0.25rem;
	}

	.pick-header {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 0.5rem;
	}

	.filter input {
		width: min(100%, 18rem);
	}

	.state {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
		height: 100%;
	}

	.state h3 {
		margin: 0 0 0.2rem;
	}

	.code {
		display: grid;
		place-items: center;
		flex: none;
		width: 3rem;
		height: 3rem;
		border-radius: 0.8rem;
		background: var(--primary-soft);
		color: var(--primary);
		font-weight: 800;
	}

	.general .code {
		background: var(--surface-2);
		color: var(--muted);
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		align-items: flex-start;
	}

	.meta {
		color: var(--muted);
		font-size: 0.92rem;
	}

	.how {
		counter-reset: step;
	}

	.how li {
		color: var(--primary);
	}

	.how h3 {
		margin-top: 0.5rem;
		color: var(--text);
	}

	.how p {
		color: var(--text);
		margin: 0;
	}

	.trust {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem 2rem;
		margin-top: 1.5rem;
		padding: 0;
		list-style: none;
		font-weight: 600;
		color: var(--muted);
	}
</style>
