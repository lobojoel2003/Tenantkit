<script lang="ts">
	import { useI18n } from '../i18n/index.ts';
	import { CONTENT_GUIDE, paths, REPOSITORY } from '../paths.ts';
	import Icon from './Icon.svelte';

	const i18n = useI18n();
	const build = __TENANTKIT_BUILD__;
</script>

<footer class="site">
	<div class="container">
		<p class="disclaimer"><Icon name="law" size={18} /> {i18n.t('footer.disclaimer')}</p>
		<p class="privacy"><Icon name="lock" size={18} /> {i18n.t('footer.privacy')}</p>
		<ul class="links">
			<li><a href={paths.about(i18n.locale)}>{i18n.t('nav.about')}</a></li>
			<li><a href={REPOSITORY} rel="external noopener">{i18n.t('footer.source')}</a></li>
			<li><a href={CONTENT_GUIDE} rel="external noopener">{i18n.t('footer.contribute')}</a></li>
		</ul>
		<p class="meta">
			{i18n.t('footer.licenses')}
			<br />
			<span data-testid="build-info">
				{i18n.t('footer.version', {
					version: build.version,
					build: build.buildNumber,
					commit: build.commit
				})}
			</span>
		</p>
	</div>
</footer>

<style>
	footer {
		margin-top: 4rem;
		padding-block: 2rem 2.5rem;
		background: var(--surface);
		border-top: 1px solid var(--border);
		font-size: 0.95rem;
	}

	p {
		display: flex;
		gap: 0.5rem;
		align-items: baseline;
		max-width: var(--reading);
	}

	.links {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem 1.5rem;
		padding: 0;
		list-style: none;
		font-weight: 600;
	}

	.meta {
		display: block;
		color: var(--muted);
		font-size: 0.85rem;
		margin: 0;
	}
</style>
