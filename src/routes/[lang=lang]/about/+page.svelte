<script lang="ts">
	import Breadcrumbs from '#lib/components/Breadcrumbs.svelte';
	import Seo from '#lib/components/Seo.svelte';
	import { useI18n } from '#lib/i18n/index.ts';
	import { CONTENT_GUIDE, paths, REPOSITORY } from '#lib/paths.ts';

	const i18n = useI18n();
	const build = __TENANTKIT_BUILD__;
	const sources = [
		{
			label: 'Next City (2021): Tech tools aim to help tenants fight eviction',
			url: 'https://nextcity.org/urbanist-news/tech-tools-aim-to-help-tenants-fight-eviction'
		},
		{
			label: 'Planetizen (2025): Tech tools help tenants push back against problematic landlords',
			url: 'https://www.planetizen.com/news/2025/06/135365-tech-tools-help-tenants-push-back-against-problematic-landlords'
		}
	];
</script>

<Seo title={i18n.t('about.title')} description={i18n.t('about.lead')} />

<div class="container reading">
	<Breadcrumbs
		items={[
			{ label: i18n.t('nav.home'), href: paths.home(i18n.locale) },
			{ label: i18n.t('nav.about') }
		]}
	/>
	<h1>{i18n.t('about.title')}</h1>
	<p class="lead">{i18n.t('about.lead')}</p>

	<section>
		<h2>{i18n.t('about.whyTitle')}</h2>
		<p>{i18n.t('about.why1')}</p>
		<p>{i18n.t('about.why2')}</p>
	</section>

	<section>
		<h2>{i18n.t('about.howTitle')}</h2>
		<p>{i18n.t('about.how1')}</p>
		<p>{i18n.t('about.how2')}</p>
	</section>

	<section>
		<h2>{i18n.t('about.privacyTitle')}</h2>
		<p>{i18n.t('about.privacy1')}</p>
		<p>{i18n.t('about.privacy2')}</p>
	</section>

	<section>
		<h2>{i18n.t('about.legalTitle')}</h2>
		<p>{i18n.t('about.legal1')}</p>
	</section>

	<section>
		<h2>{i18n.t('about.licenseTitle')}</h2>
		<p>
			{i18n.t('about.license1')}
			<a href="{REPOSITORY}/blob/main/LICENSE" rel="external noopener">AGPL-3.0</a>
		</p>
		<p>
			{i18n.t('about.license2')}
			<a href="{REPOSITORY}/blob/main/content/LICENSE.md" rel="external noopener">CC BY 4.0</a>
		</p>
	</section>

	<section>
		<h2>{i18n.t('about.contributeTitle')}</h2>
		<p>{i18n.t('about.contribute1')}</p>
		<p>
			<a class="button" href={CONTENT_GUIDE} rel="external noopener"
				>{i18n.t('about.contributeLink')}</a
			>
		</p>
	</section>

	<section>
		<h2>{i18n.t('about.sourcesTitle')}</h2>
		<ul>
			{#each sources as source (source.url)}
				<li><a href={source.url} rel="external noopener">{source.label}</a></li>
			{/each}
		</ul>
	</section>

	<section>
		<h2>{i18n.t('about.buildTitle')}</h2>
		<p class="muted">
			{i18n.t('footer.version', {
				version: build.version,
				build: build.buildNumber,
				commit: build.commit
			})} · {build.date}
		</p>
	</section>
</div>
