<script lang="ts">
	import SiteFooter from '#lib/components/SiteFooter.svelte';
	import SiteHeader from '#lib/components/SiteHeader.svelte';
	import { localeInfo } from '#lib/i18n/config.ts';
	import { createI18n, provideI18n } from '#lib/i18n/index.ts';

	let { data, children } = $props();

	provideI18n(createI18n(() => data.locale));

	// Keep <html lang> right when switching language without a full reload.
	$effect(() => {
		document.documentElement.lang = data.locale;
		document.documentElement.dir = localeInfo(data.locale).dir;
	});
</script>

<SiteHeader />
<main id="main" tabindex="-1">
	{@render children()}
</main>
<SiteFooter />

<style>
	main {
		outline: none;
		min-height: 60vh;
	}
</style>
