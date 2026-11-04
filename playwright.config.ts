import { defineConfig, devices } from '@playwright/test';

const port = 4173;

export default defineConfig({
	testDir: 'tests/e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	// Each test runs a real browser; more than two at once overloads small CI machines.
	workers: 2,
	reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: `http://localhost:${port}`,
		trace: 'retain-on-failure',
		locale: 'en-US',
		timezoneId: 'America/Los_Angeles'
	},
	projects: [
		{ name: 'desktop', use: { ...devices['Desktop Chrome'] } },
		{ name: 'mobile', use: { ...devices['Pixel 7'] } }
	],
	webServer: {
		// Serves the built site (run `npm run build` first) the way GitHub Pages does.
		command: `npx tsx scripts/serve.ts build`,
		env: { PORT: String(port) },
		port,
		reuseExistingServer: !process.env.CI
	}
});
