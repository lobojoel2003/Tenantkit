<script lang="ts">
	import { page } from '$app/state';
	import { LOCALES } from '../i18n/config.ts';
	import { useI18n } from '../i18n/index.ts';

	let { title, description }: { title?: string; description?: string } = $props();
	const i18n = useI18n();
	const fullTitle = $derived(
		title
			? `${title} · ${i18n.t('site.name')}`
			: `${i18n.t('site.name')}: ${i18n.t('site.tagline')}`
	);
	const alternates = $derived(
		LOCALES.filter((option) => option.code !== i18n.locale).map((option) => ({
			code: option.code,
			href: page.url.pathname.replace(`/${i18n.locale}/`, `/${option.code}/`)
		}))
	);
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={description ?? i18n.t('site.description')} />
	<meta property="og:title" content={fullTitle} />
	<meta property="og:description" content={description ?? i18n.t('site.description')} />
	<meta property="og:type" content="website" />
	{#each alternates as alternate (alternate.code)}
		<link rel="alternate" hreflang={alternate.code} href={alternate.href} />
	{/each}
</svelte:head>
