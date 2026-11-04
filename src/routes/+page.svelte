<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { DEFAULT_LOCALE, LOCALES, isLocale } from '#lib/i18n/config.ts';
	import { paths } from '#lib/paths.ts';

	// Send people to their browser's language when we have it.
	onMount(() => {
		const preferred = navigator.languages
			.map((language) => language.toLowerCase().split('-')[0])
			.find((language) => isLocale(language));
		void goto(paths.home(isLocale(preferred) ? preferred : DEFAULT_LOCALE), { replaceState: true });
	});
</script>

<svelte:head>
	<title>Tenantkit</title>
	<meta
		name="description"
		content="Free tools for renters: legal deadlines and letters to your landlord. Herramientas gratuitas para inquilinos."
	/>
</svelte:head>

<main class="container chooser">
	<h1>Tenantkit</h1>
	<ul>
		{#each LOCALES as option (option.code)}
			<li>
				<a class="button" href={paths.home(option.code)} lang={option.code} hreflang={option.code}
					>{option.name}</a
				>
			</li>
		{/each}
	</ul>
</main>

<style>
	.chooser {
		min-height: 80vh;
		display: grid;
		place-content: center;
		text-align: center;
	}

	ul {
		display: flex;
		gap: 1rem;
		padding: 0;
		list-style: none;
	}
</style>
