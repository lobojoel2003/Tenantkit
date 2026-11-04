<script lang="ts">
	import { page } from '$app/state';
	import { DEFAULT_LOCALE, isLocale } from '#lib/i18n/config.ts';
	import { translate } from '#lib/i18n/index.ts';
	import { paths } from '#lib/paths.ts';

	const segment = $derived(page.url.pathname.split('/').find((part) => isLocale(part)));
	const locale = $derived(isLocale(segment) ? segment : DEFAULT_LOCALE);
	const notFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{translate(locale, notFound ? 'error.notFound' : 'error.generic')} · Tenantkit</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="container reading error" id="main" lang={locale}>
	<p class="code">{page.status}</p>
	<h1>{translate(locale, notFound ? 'error.notFound' : 'error.generic')}</h1>
	<p class="lead">{translate(locale, notFound ? 'error.notFoundText' : 'error.genericText')}</p>
	<p><a class="button" href={paths.home(locale)}>{translate(locale, 'error.home')}</a></p>
</main>

<style>
	.error {
		padding-block: 4rem;
	}

	.code {
		font-size: 3rem;
		font-weight: 800;
		color: var(--muted);
		margin: 0;
	}
</style>
