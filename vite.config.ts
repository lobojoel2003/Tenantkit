/// <reference types="vitest/config" />
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
	version: string;
};

function git(command: string): string | undefined {
	try {
		return execSync(`git ${command}`, { stdio: ['ignore', 'pipe', 'ignore'] })
			.toString()
			.trim();
	} catch {
		return undefined;
	}
}

/** Build metadata baked into the bundle and shown in the site footer. */
const build = {
	version: pkg.version,
	// The build number is the number of commits, so the same commit always gets the same number.
	buildNumber: process.env.BUILD_NUMBER ?? git('rev-list --count HEAD') ?? 'dev',
	commit: process.env.GITHUB_SHA?.slice(0, 7) ?? git('rev-parse --short HEAD') ?? 'unknown',
	date: (process.env.SOURCE_DATE_EPOCH
		? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000)
		: new Date()
	)
		.toISOString()
		.slice(0, 10)
};

/** Set BASE_PATH=/Tenantkit when deploying to a GitHub Pages project site. */
const base = (process.env.BASE_PATH ?? '').replace(/\/$/, '') as '' | `/${string}`;

export default defineConfig({
	plugins: [
		sveltekit({
			adapter: adapter({ fallback: '404.html', strict: true }),
			paths: { base, relative: true },
			version: { name: `${build.version}+${build.buildNumber}` },
			prerender: { handleHttpError: 'fail', handleMissingId: 'fail' },
			csp: {
				mode: 'hash',
				directives: {
					'default-src': ['self'],
					'script-src': ['self'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:', 'blob:'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'object-src': ['none'],
					'base-uri': ['self'],
					'form-action': ['self']
				}
			}
		})
	],
	define: {
		__TENANTKIT_BUILD__: JSON.stringify(build)
	},
	server: { fs: { allow: ['content'] } },
	test: {
		include: ['tests/unit/**/*.test.ts'],
		environment: 'node',
		coverage: {
			provider: 'v8',
			include: ['src/lib/engine/**', 'src/lib/pdf/**', 'src/lib/i18n/**'],
			reporter: ['text', 'html', 'lcov'],
			thresholds: { lines: 85, functions: 85, statements: 85, branches: 75 }
		}
	}
});
