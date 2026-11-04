import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

/** Fail if the page tries to reach any server other than the site itself. */
async function blockExternalRequests(page: Page) {
	const external: string[] = [];
	await page.route('**/*', (route) => {
		const url = new URL(route.request().url());
		if (url.hostname !== 'localhost' && url.protocol !== 'data:' && url.protocol !== 'blob:') {
			external.push(url.href);
			return route.abort();
		}
		return route.continue();
	});
	return external;
}

test.describe('navigation and languages', () => {
	test('home lists every jurisdiction and switches language', async ({ page }) => {
		const external = await blockExternalRequests(page);
		await page.goto('/en/');
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			'Know your deadlines. Send the right letter.'
		);
		const states = page.getByTestId('state-list').getByRole('listitem');
		await expect(states).toHaveCount(6);
		await expect(states.last()).toContainText('Other U.S. states');
		await page.getByRole('link', { name: 'Español' }).click();
		await expect(page).toHaveURL(/\/es\/$/);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText(
			'Conozca sus plazos. Envíe la carta correcta.'
		);
		await expect(page.locator('html')).toHaveAttribute('lang', 'es');
		expect(external).toEqual([]);
	});

	test('the root page sends people to their browser language', async ({ browser }) => {
		const spanish = await browser.newContext({ locale: 'es-MX' });
		const page = await spanish.newPage();
		await page.goto('/');
		await expect(page).toHaveURL(/\/es\/$/);
		await spanish.close();
	});

	test('state → topic → deadline flow', async ({ page }) => {
		await page.goto('/en/us-tx/');
		await expect(page.getByTestId('review-status')).toContainText('Draft');
		await expect(page.getByTestId('holiday-list').getByRole('listitem').first()).toBeVisible();
		await page.getByTestId('topic-eviction').click();
		await expect(page).toHaveURL(/\/en\/us-tx\/eviction\/$/);
		await expect(page.getByTestId('deadline-list').getByRole('listitem')).not.toHaveCount(0);
		await expect(page.getByTestId('letter-list')).toContainText('payment plan');
	});

	test('unknown pages show a friendly 404', async ({ page }) => {
		const response = await page.goto('/es/no-existe/');
		expect(response?.status()).toBe(404);
		await expect(page.getByRole('heading', { level: 1 })).toHaveText('No se encontró la página');
	});

	test('build info is published', async ({ request }) => {
		const info = await (await request.get('/build-info.json')).json();
		expect(info).toMatchObject({
			name: 'tenantkit',
			version: expect.stringMatching(/^\d+\.\d+\.\d+/)
		});
		expect(info.jurisdictions.length).toBeGreaterThan(1);
	});
});

test.describe('deadline calculator', () => {
	test('counts California court days around Thanksgiving', async ({ page }) => {
		await page.goto('/en/us-ca/deadlines/eviction-response/');
		await page.getByTestId('trigger-date').fill('2026-11-20');
		// 10 court days after Fri Nov 20, skipping weekends, Thanksgiving and the day after.
		await expect(page.getByTestId('due-date')).toHaveAttribute('data-date', '2026-12-08');
		await page.getByText('How we counted').click();
		await expect(page.locator('.timeline')).toContainText('Thanksgiving');

		// Substituted service is complete 10 days after mailing; counting starts after that.
		await page.getByLabel(/left with someone else/).check();
		await expect(page.getByTestId('due-date')).toHaveAttribute('data-date', '2026-12-14');
		await expect(page).toHaveURL(/#date=2026-11-20&choice=substituted$/);

		const download = page.waitForEvent('download');
		await page.getByTestId('add-to-calendar').click();
		expect((await download).suggestedFilename()).toBe('tenantkit-eviction-response-2026-12-14.ics');
	});

	test('restores a shared date from the address', async ({ page }) => {
		await page.goto('/es/us-wa/deadlines/deposit-return/#date=2026-11-02');
		await expect(page.getByTestId('due-date')).toHaveAttribute('data-date', '2026-12-02');
		await expect(page.getByTestId('deadline-result')).toContainText('El plazo de su arrendador');
	});
});

test.describe('letter wizard', () => {
	test('fills in a letter, checks answers and downloads a PDF', async ({ page }) => {
		const external = await blockExternalRequests(page);
		await page.goto('/en/us-ca/letters/deposit-demand/');

		// Step 1 needs answers before moving on.
		await page.getByTestId('next-step').click();
		await expect(page.getByRole('alert')).toContainText('Please check the highlighted answers.');
		await page.getByLabel('Your full name').fill('Ana López');
		await page.getByLabel('Address of the rental home').fill('1 Elm St, Apt 2, Oakland, CA 94601');
		await page.getByLabel('Your new mailing address').fill('9 Oak Ave\nBerkeley, CA 94704');
		await page.getByTestId('next-step').click();

		await expect(page.getByTestId('step-heading')).toHaveText('Your landlord');
		await page.getByLabel('Landlord or property manager').fill('Sunrise Property Management');
		await page.getByLabel("Landlord's mailing address").fill('500 Market St\nOakland, CA 94607');
		await page.getByTestId('next-step').click();

		await expect(page.getByTestId('step-heading')).toHaveText('Details');
		await page.getByLabel('The day you moved out and returned the keys').fill('2026-10-01');
		await page.getByLabel('How much was your security deposit?').fill('1800');
		await page.getByTestId('next-step').click();
		await expect(page.getByTestId('step-heading')).toHaveText('Sending');
		await page.getByTestId('next-step').click();

		await expect(page.getByTestId('step-heading')).toHaveText('Review');
		await expect(page.getByTestId('missing-answers')).toHaveCount(0);
		const preview = page.getByTestId('letter-preview');
		await expect(preview).toContainText('Ana López');
		await expect(preview).toContainText('$1,800.00');
		await expect(preview).toContainText('1950.5');
		// 21 days after Oct 1, 2026.
		await expect(preview).toContainText('October 22, 2026');

		const download = page.waitForEvent('download');
		await page.getByTestId('download-pdf').click();
		const file = await download;
		expect(file.suggestedFilename()).toMatch(/\.pdf$/);
		const path = await file.path();
		const { readFileSync } = await import('node:fs');
		expect(readFileSync(path).subarray(0, 5).toString()).toBe('%PDF-');

		// Same answers, letter written in Spanish.
		await page.getByRole('radio', { name: 'Español' }).check();
		await expect(preview).toContainText('Atentamente,');
		await expect(preview).toContainText('22 de octubre de 2026');
		expect(external).toEqual([]);
	});

	test('remembers answers only when asked', async ({ page }) => {
		await page.goto('/en/us-general/letters/repair-request/');
		await page.getByLabel('Your full name').fill('Sam Rivera');
		await page.reload();
		await expect(page.getByLabel('Your full name')).toHaveValue('');

		await page.getByLabel('Your full name').fill('Sam Rivera');
		await page.getByTestId('remember').check();
		await page.reload();
		await expect(page.getByLabel('Your full name')).toHaveValue('Sam Rivera');

		page.once('dialog', (dialog) => dialog.accept());
		await page.getByRole('button', { name: 'Clear my answers' }).click();
		await expect(page.getByLabel('Your full name')).toHaveValue('');
		await page.reload();
		await expect(page.getByLabel('Your full name')).toHaveValue('');
	});
});

test.describe('accessibility', () => {
	for (const path of [
		'/en/',
		'/es/us-ny/',
		'/en/us-fl/eviction/',
		'/en/us-tx/deadlines/eviction-appeal/#date=2026-11-02',
		'/es/us-wa/letters/repair-request/',
		'/en/about/'
	]) {
		test(`no serious problems on ${path}`, async ({ page }) => {
			await page.goto(path);
			await page.waitForLoadState('networkidle');
			const results = await new AxeBuilder({ page })
				.withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
				.analyze();
			const serious = results.violations.filter((violation) =>
				['serious', 'critical'].includes(violation.impact ?? '')
			);
			expect(
				serious.map(
					(violation) => `${violation.id}: ${violation.nodes.map((node) => node.target).join(', ')}`
				)
			).toEqual([]);
		});
	}
});
