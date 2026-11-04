<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { todayISO } from '../engine/civil-date.ts';
	import { HolidayCalendar } from '../engine/holidays.ts';
	import {
		hasMissingValues,
		initialValues,
		isFieldVisible,
		letterToText,
		renderLetter,
		validateValues,
		type FieldValues
	} from '../engine/letters.ts';
	import type { FieldSection, LocalizedJurisdiction, LocalizedLetter } from '../engine/model.ts';
	import { segmentsToText } from '../engine/template.ts';
	import { downloadBlob, fileSlug } from '../download.ts';
	import { LOCALES, type Locale } from '../i18n/config.ts';
	import { translate, useI18n, type MessageKey } from '../i18n/index.ts';
	import FormField from './FormField.svelte';
	import Icon from './Icon.svelte';
	import LetterPreview from './LetterPreview.svelte';

	let {
		letter,
		variants,
		jurisdiction,
		jurisdictionNames
	}: {
		letter: LocalizedLetter;
		variants: Partial<Record<Locale, LocalizedLetter>>;
		jurisdiction: LocalizedJurisdiction;
		jurisdictionNames: Partial<Record<Locale, string>>;
	} = $props();

	const i18n = useI18n();
	const SECTIONS: FieldSection[] = ['you', 'landlord', 'details', 'sending'];
	const steps = $derived([
		...SECTIONS.filter((section) => letter.fields.some((field) => field.section === section)),
		'review' as const
	]);
	const storageKey = $derived(`tenantkit:v1:${jurisdiction.id}:${letter.id}`);
	const calendar = $derived(new HolidayCalendar(jurisdiction.holidayRules));
	const letterLocales = $derived(LOCALES.filter((option) => variants[option.code]));

	let values: FieldValues = $state({});
	let step = $state(0);
	let checked: Record<number, boolean> = $state({});
	let remember = $state(false);
	let letterLocale: Locale = $state('en');
	let busy = $state(false);
	let message = $state('');
	let today = $state(todayISO());
	let heading: HTMLElement | undefined = $state();

	// Answers start fresh for each letter page (and are restored below if the person chose to save them).
	$effect.pre(() => {
		values = initialValues(letter, todayISO());
		letterLocale = variants[i18n.locale] ? i18n.locale : 'en';
		step = 0;
		checked = {};
	});

	onMount(() => {
		today = todayISO();
		try {
			const saved = localStorage.getItem(storageKey);
			if (saved) {
				values = { ...values, ...(JSON.parse(saved) as FieldValues) };
				remember = true;
			}
		} catch {
			// Storage can be unavailable (private mode, blocked site data). Answers then live only in memory.
		}
	});

	$effect(() => {
		const snapshot = JSON.stringify(values);
		try {
			if (remember) localStorage.setItem(storageKey, snapshot);
			else localStorage.removeItem(storageKey);
		} catch {
			// See above.
		}
	});

	const current = $derived(steps[step] ?? 'review');
	const problems = $derived(validateValues(letter, values));
	const visible = (section: FieldSection) =>
		letter.fields.filter(
			(field) => field.section === section && isFieldVisible(field, values, letter.fields)
		);
	const stepProblems = (index: number) => {
		const section = steps[index];
		if (!section || section === 'review') return [];
		return visible(section).filter((field) => problems[field.id]);
	};

	const variant = $derived(variants[letterLocale] ?? letter);
	const rendered = $derived(
		renderLetter(variant, values, {
			locale: letterLocale,
			calendar,
			currency: jurisdiction.currency,
			region: jurisdiction.country,
			jurisdictionName: jurisdictionNames[letterLocale] ?? jurisdiction.name,
			today,
			missingDateLabel: translate(letterLocale, 'letter.computedMissing')
		})
	);
	const missingFields = $derived(
		letter.fields.filter(
			(field) => problems[field.id] === 'required' && isFieldVisible(field, values, letter.fields)
		)
	);

	function stepLabel(name: (typeof steps)[number]): string {
		return i18n.t(`letter.step.${name}` as MessageKey);
	}

	async function go(index: number) {
		step = Math.max(0, Math.min(index, steps.length - 1));
		await tick();
		heading?.focus();
		heading?.scrollIntoView({ block: 'start', behavior: 'smooth' });
	}

	async function next() {
		if (stepProblems(step).length > 0) {
			checked[step] = true;
			await tick();
			const first = document.querySelector<HTMLElement>('.form-col [aria-invalid="true"]');
			first?.focus();
			return;
		}
		await go(step + 1);
	}

	function problemText(fieldId: string, index: number): string | undefined {
		const problem = problems[fieldId];
		if (!problem || !checked[index]) return undefined;
		return i18n.t(`letter.problem.${problem}` as MessageKey);
	}

	function stepOfField(fieldId: string): number {
		const field = letter.fields.find((candidate) => candidate.id === fieldId);
		return Math.max(
			0,
			steps.findIndex((section) => section === field?.section)
		);
	}

	const baseName = $derived(
		`${fileSlug(variant.title)}-${typeof values.letter_date === 'string' ? values.letter_date : today}`
	);

	async function downloadPdf() {
		busy = true;
		message = '';
		try {
			const { createLetterPdf } = await import('../pdf/letter-pdf.ts');
			const build = __TENANTKIT_BUILD__;
			const bytes = await createLetterPdf(rendered, {
				title: segmentsToText(rendered.subject) || variant.title,
				author: typeof values.tenant_name === 'string' ? values.tenant_name : undefined,
				language: letterLocale,
				creator: `Tenantkit ${build.version}`,
				pageLabel: (page, pages) => translate(letterLocale, 'letter.pdfPage', { page, pages })
			});
			downloadBlob(new Blob([bytes as BlobPart], { type: 'application/pdf' }), `${baseName}.pdf`);
		} catch (error) {
			console.error(error);
			message = i18n.t('letter.pdfFailed');
		} finally {
			busy = false;
		}
	}

	function downloadText() {
		downloadBlob(
			new Blob([letterToText(rendered)], { type: 'text/plain;charset=utf-8' }),
			`${baseName}.txt`
		);
	}

	async function copyText() {
		try {
			await navigator.clipboard.writeText(letterToText(rendered));
			message = i18n.t('letter.copied');
		} catch {
			message = i18n.t('letter.copyFailed');
		}
	}

	function clearAnswers() {
		if (!confirm(i18n.t('letter.confirmClear'))) return;
		remember = false;
		values = initialValues(letter, todayISO());
		checked = {};
		void go(0);
	}
</script>

<div class="wizard" class:reviewing={current === 'review'}>
	<div class="form-col no-print">
		<nav aria-label={i18n.t('letter.stepsLabel')}>
			<ol class="steps">
				{#each steps as name, index (name)}
					<li>
						<button
							type="button"
							class:active={index === step}
							class:invalid={checked[index] && stepProblems(index).length > 0}
							aria-current={index === step ? 'step' : undefined}
							onclick={() => go(index)}
						>
							<span class="number">{index + 1}</span>
							<span class="name">{stepLabel(name)}</span>
						</button>
					</li>
				{/each}
			</ol>
		</nav>

		<div class="step card">
			<p class="small muted">
				{i18n.t('letter.stepOf', { current: step + 1, total: steps.length })}
			</p>
			<h2 tabindex="-1" bind:this={heading} data-testid="step-heading">{stepLabel(current)}</h2>

			{#if current !== 'review'}
				{#if checked[step] && stepProblems(step).length > 0}
					<p class="notice danger" role="alert">{i18n.t('letter.fixFirst')}</p>
				{/if}
				{#each visible(current) as field (field.id)}
					<FormField {field} bind:value={values[field.id]} problem={problemText(field.id, step)} />
				{/each}

				{#if current === 'sending' && letterLocales.length > 1}
					<fieldset class="field">
						<legend>{i18n.t('letter.language')}</legend>
						<span class="help">{i18n.t('letter.languageHelp')}</span>
						{#each letterLocales as option (option.code)}
							<label class="choice">
								<input
									type="radio"
									name="letter-language"
									value={option.code}
									bind:group={letterLocale}
								/>
								<span lang={option.code}>{option.name}</span>
							</label>
						{/each}
					</fieldset>
				{/if}

				<div class="button-row nav-buttons">
					{#if step > 0}
						<button type="button" class="button secondary" onclick={() => go(step - 1)}
							><Icon name="back" /> {i18n.t('letter.back')}</button
						>
					{/if}
					<button type="button" class="button" onclick={next} data-testid="next-step">
						{step === steps.length - 2 ? i18n.t('letter.toReview') : i18n.t('letter.next')}
						<Icon name="chevron" />
					</button>
				</div>
			{:else}
				{#if missingFields.length > 0}
					<div class="notice warning" data-testid="missing-answers">
						<p>
							<strong>{i18n.tn('letter.missing', missingFields.length)}</strong>
							{i18n.t('letter.missingHelp')}
						</p>
						<ul>
							{#each missingFields as field (field.id)}
								<li>
									<button type="button" class="link" onclick={() => go(stepOfField(field.id))}
										>{field.label}</button
									>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				{#if letterLocales.length > 1}
					<fieldset class="field">
						<legend>{i18n.t('letter.language')}</legend>
						{#each letterLocales as option (option.code)}
							<label class="choice">
								<input
									type="radio"
									name="letter-language-review"
									value={option.code}
									bind:group={letterLocale}
								/>
								<span lang={option.code}>{option.name}</span>
							</label>
						{/each}
					</fieldset>
				{/if}

				<div class="button-row actions">
					<button
						type="button"
						class="button"
						onclick={downloadPdf}
						disabled={busy}
						data-testid="download-pdf"
					>
						<Icon name="download" />
						{busy ? i18n.t('letter.making') : i18n.t('letter.download')}
					</button>
					<button type="button" class="button secondary" onclick={() => window.print()}
						><Icon name="print" /> {i18n.t('letter.print')}</button
					>
					<button type="button" class="button secondary" onclick={copyText}
						><Icon name="copy" /> {i18n.t('letter.copy')}</button
					>
					<button type="button" class="button secondary" onclick={downloadText}
						><Icon name="letter" /> {i18n.t('letter.downloadText')}</button
					>
				</div>
				<p class="status" role="status">{message}</p>

				{#if letter.deliveryTips.length > 0}
					<h3>{i18n.t('letter.tips')}</h3>
					<ul class="tips">
						{#each letter.deliveryTips as tip (tip)}<li>{tip}</li>{/each}
					</ul>
				{/if}
				{#if letter.checklist.length > 0}
					<h3>{i18n.t('letter.checklist')}</h3>
					<ul class="checklist">
						{#each letter.checklist as item (item)}<li>
								<Icon name="check" size={16} />
								{item}
							</li>{/each}
					</ul>
				{/if}

				<div class="button-row">
					<button type="button" class="button secondary" onclick={() => go(step - 1)}
						><Icon name="back" /> {i18n.t('letter.back')}</button
					>
				</div>
			{/if}
		</div>

		<div class="privacy card">
			<p><Icon name="lock" /> {i18n.t('letter.privacy')}</p>
			<label class="choice">
				<input type="checkbox" bind:checked={remember} data-testid="remember" />
				<span>
					{i18n.t('letter.remember')}
					<span class="help">{i18n.t('letter.rememberHelp')}</span>
				</span>
			</label>
			<button type="button" class="link danger" onclick={clearAnswers}
				><Icon name="trash" size={16} /> {i18n.t('letter.clear')}</button
			>
		</div>
	</div>

	<div class="preview-col">
		<!-- The preview scrolls on its own on wide screens, so keyboard users need to be able to focus it. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<section class="sticky" aria-label={i18n.t('letter.preview')} tabindex="0">
			<h2 class="no-print preview-title">{i18n.t('letter.preview')}</h2>
			<p class="small muted no-print">{i18n.t('letter.previewHint')}</p>
			{#if hasMissingValues(rendered) && current !== 'review'}
				<span class="visually-hidden">{i18n.tn('letter.missing', missingFields.length)}</span>
			{/if}
			<LetterPreview letter={rendered} lang={letterLocale} />
		</section>
	</div>
</div>

<style>
	.wizard {
		display: grid;
		gap: 1.5rem;
		align-items: start;
	}

	@media (min-width: 64rem) {
		.wizard {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
			gap: 2rem;
		}

		.sticky {
			position: sticky;
			top: 1rem;
			max-height: calc(100vh - 2rem);
			overflow: auto;
			padding: 0.25rem;
		}
	}

	@media (max-width: 63.99rem) {
		.wizard:not(.reviewing) .preview-col {
			display: none;
		}
	}

	.steps {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin: 0 0 1rem;
		padding: 0;
		list-style: none;
	}

	.steps button {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.35rem 0.75rem 0.35rem 0.35rem;
		border: 1px solid var(--border);
		border-radius: 999px;
		background: var(--surface);
		color: var(--muted);
		font: inherit;
		font-size: 0.92rem;
		cursor: pointer;
	}

	.steps button.active {
		border-color: var(--primary);
		color: var(--text);
		font-weight: 700;
	}

	.steps button.invalid {
		border-color: var(--danger);
	}

	.number {
		display: grid;
		place-items: center;
		width: 1.6rem;
		height: 1.6rem;
		border-radius: 50%;
		background: var(--surface-2);
		font-weight: 700;
		font-size: 0.85rem;
	}

	.active .number {
		background: var(--primary);
		color: var(--on-primary);
	}

	.step h2 {
		outline: none;
	}

	.nav-buttons {
		margin-top: 2rem;
		justify-content: space-between;
	}

	.actions {
		margin-block: 1rem 0.5rem;
	}

	.status {
		min-height: 1.6em;
		font-weight: 600;
	}

	.tips li {
		margin-bottom: 0.5rem;
	}

	.checklist {
		padding: 0;
		list-style: none;
	}

	.checklist li {
		display: flex;
		gap: 0.5rem;
		align-items: baseline;
	}

	.privacy {
		margin-top: 1rem;
		font-size: 0.95rem;
	}

	.privacy p {
		display: flex;
		gap: 0.5rem;
	}

	.privacy .help {
		display: block;
		color: var(--muted);
		font-weight: 400;
		font-size: 0.9rem;
	}

	.link {
		background: none;
		border: 0;
		padding: 0;
		color: var(--primary);
		font: inherit;
		text-decoration: underline;
		cursor: pointer;
		display: inline-flex;
		gap: 0.35rem;
		align-items: center;
	}

	.link.danger {
		color: var(--danger);
		margin-top: 0.5rem;
	}

	.preview-title {
		font-size: 1.2rem;
	}

	@media print {
		.wizard {
			display: block;
		}

		.preview-col {
			display: block !important;
		}
	}
</style>
