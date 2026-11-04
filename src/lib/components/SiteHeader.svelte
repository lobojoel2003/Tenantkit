<script lang="ts">
	import { page } from '$app/state';
	import { LOCALES, type Locale } from '../i18n/config.ts';
	import { useI18n } from '../i18n/index.ts';
	import { paths } from '../paths.ts';
	import Icon from './Icon.svelte';

	const i18n = useI18n();

	/** The current page in another language. */
	function switchTo(code: Locale): string {
		const { pathname, hash } = page.url;
		const segment = `/${i18n.locale}/`;
		const index = pathname.indexOf(segment);
		if (index === -1) return paths.home(code);
		return pathname.slice(0, index) + `/${code}/` + pathname.slice(index + segment.length) + hash;
	}
</script>

<header class="site">
	<a class="skip" href="#main">{i18n.t('nav.skip')}</a>
	<div class="container bar">
		<a class="brand" href={paths.home(i18n.locale)}>
			<span class="mark"><Icon name="logo" size={22} /></span>
			<span>
				<span class="name">{i18n.t('site.name')}</span>
				<span class="tagline">{i18n.t('site.tagline')}</span>
			</span>
		</a>
		<nav aria-label={i18n.t('nav.main')}>
			<ul>
				<li><a href={paths.about(i18n.locale)}>{i18n.t('nav.about')}</a></li>
				<li class="languages">
					<Icon name="globe" size={18} />
					<span class="visually-hidden">{i18n.t('nav.language')}:</span>
					{#each LOCALES as option (option.code)}
						{#if option.code === i18n.locale}
							<span class="current" aria-current="true" lang={option.code}>{option.name}</span>
						{:else}
							<a
								href={switchTo(option.code)}
								hreflang={option.code}
								lang={option.code}
								data-sveltekit-noscroll>{option.name}</a
							>
						{/if}
					{/each}
				</li>
			</ul>
		</nav>
	</div>
</header>

<style>
	header {
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}

	.skip {
		position: absolute;
		left: 0.5rem;
		top: -3rem;
		z-index: 10;
		padding: 0.5rem 1rem;
		background: var(--primary);
		color: var(--on-primary);
		border-radius: var(--radius-sm);
	}

	.skip:focus {
		top: 0.5rem;
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 1.5rem;
		padding-block: 0.75rem;
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 0.65rem;
		color: var(--text);
		text-decoration: none;
	}

	.mark {
		display: grid;
		place-items: center;
		width: 2.4rem;
		height: 2.4rem;
		border-radius: 0.7rem;
		background: var(--primary);
		color: var(--on-primary);
	}

	.name {
		display: block;
		font-weight: 800;
		font-size: 1.2rem;
		line-height: 1.1;
		letter-spacing: -0.01em;
	}

	.tagline {
		display: block;
		font-size: 0.85rem;
		color: var(--muted);
	}

	ul {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.25rem 1.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	nav a {
		font-weight: 600;
	}

	.languages {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		color: var(--muted);
	}

	.current {
		font-weight: 700;
		color: var(--text);
	}
</style>
