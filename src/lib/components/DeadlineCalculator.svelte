<script lang="ts">
	import { onMount } from 'svelte';
	import { replaceState } from '$app/navigation';
	import { page } from '$app/state';
	import { formatWeekday, isISODate, todayISO } from '../engine/civil-date.ts';
	import { computeRule, urgency, type SkippedDay } from '../engine/deadlines.ts';
	import { HolidayCalendar } from '../engine/holidays.ts';
	import { createCalendar } from '../engine/ics.ts';
	import type { LocalizedDeadline, LocalizedJurisdiction } from '../engine/model.ts';
	import { downloadBlob } from '../download.ts';
	import { useI18n, type PluralKey } from '../i18n/index.ts';
	import Icon from './Icon.svelte';

	let {
		deadline,
		jurisdiction
	}: { deadline: LocalizedDeadline; jurisdiction: LocalizedJurisdiction } = $props();

	const i18n = useI18n();
	const calendar = $derived(new HolidayCalendar(jurisdiction.holidayRules));
	const inputId = $derived(`trigger-${deadline.id}`);

	let date = $state('');
	let choice = $state('');
	let today = $state(todayISO());
	let mounted = $state(false);

	const choices = $derived(deadline.options?.choices ?? []);
	const selected = $derived(choices.find((option) => option.id === choice) ?? choices[0]);
	const result = $derived(
		isISODate(date) ? computeRule(deadline, date, calendar, selected?.id) : null
	);
	const status = $derived(result ? urgency(result.due, today) : null);
	const invalid = $derived(date !== '' && !isISODate(date));

	onMount(() => {
		today = todayISO();
		const params = new URLSearchParams(location.hash.slice(1));
		const fromHash = params.get('date');
		if (fromHash && isISODate(fromHash)) date = fromHash;
		const choiceFromHash = params.get('choice');
		if (choiceFromHash && choices.some((option) => option.id === choiceFromHash))
			choice = choiceFromHash;
		mounted = true;
	});

	// Keep the answer in the address bar (after #, so it never reaches a server) for bookmarking.
	$effect(() => {
		if (!mounted) return;
		const parts: string[] = [];
		if (isISODate(date)) parts.push(`date=${date}`);
		if (choice && choice !== choices[0]?.id) parts.push(`choice=${encodeURIComponent(choice)}`);
		const hash = parts.length > 0 ? `#${parts.join('&')}` : '';
		if (hash !== location.hash)
			replaceState(`${location.pathname}${location.search}${hash}`, page.state);
	});

	const day = (value: string) =>
		`${formatWeekday(value, i18n.locale)}, ${i18n.date(value, 'medium')}`;

	function reason(skip: SkippedDay): string {
		if (skip.reason === 'weekend') return i18n.t('deadline.weekend');
		return skip.holidays.map((holiday) => holiday.name[i18n.locale] ?? holiday.name.en).join(', ');
	}

	const timeline = $derived.by(() => {
		if (!result || result.period.unit !== 'court_days') return [];
		const rows = [
			...result.counted.map((value, index) => ({
				date: value,
				counted: true,
				label: i18n.t('deadline.dayNumber', { number: index + 1 })
			})),
			...result.skipped.map((skip) => ({
				date: skip.date,
				counted: false,
				label: `${i18n.t('deadline.skipped')}: ${reason(skip)}`
			}))
		];
		return rows.sort((a, b) => (a.date < b.date ? -1 : 1));
	});

	function periodText(unit: LocalizedDeadline['period']['unit'], amount: number): string {
		return i18n.tn(`unit.${unit}` as PluralKey, amount);
	}

	function addToCalendar() {
		if (!result) return;
		const ics = createCalendar([
			{
				uid: `${jurisdiction.id}-${deadline.id}-${result.due}@tenantkit`,
				date: result.due,
				title: `${deadline.title} (${jurisdiction.shortName})`,
				description: i18n.t('deadline.calendarDescription', {
					summary: deadline.summary,
					url: location.href
				}),
				url: location.href,
				remindDaysBefore: deadline.kind === 'tenant_deadline' ? [3, 1] : [1]
			}
		]);
		downloadBlob(
			new Blob([ics], { type: 'text/calendar;charset=utf-8' }),
			`tenantkit-${deadline.id}-${result.due}.ics`
		);
	}
</script>

<section class="calculator card" aria-labelledby="calculator-title">
	<h2 id="calculator-title"><Icon name="calendar" /> {i18n.t('deadline.calculator')}</h2>
	<p class="period">
		<strong
			>{periodText(
				(selected?.period ?? deadline.period).unit,
				(selected?.period ?? deadline.period).amount
			)}</strong
		>
	</p>

	<div class="field">
		<label for={inputId}>{deadline.trigger}</label>
		<span class="help" id="{inputId}-help">{i18n.t('deadline.dateHelp')}</span>
		<input
			id={inputId}
			type="date"
			bind:value={date}
			aria-describedby="{inputId}-help"
			aria-invalid={invalid}
			data-testid="trigger-date"
		/>
		{#if invalid}<p class="error">{i18n.t('deadline.invalidDate')}</p>{/if}
	</div>

	{#if deadline.options}
		<fieldset class="field">
			<legend>{deadline.options.question}</legend>
			{#each choices as option (option.id)}
				<label class="choice">
					<input
						type="radio"
						name="choice-{deadline.id}"
						value={option.id}
						checked={option.id === selected?.id}
						onchange={() => (choice = option.id)}
					/>
					<span>{option.label}</span>
				</label>
			{/each}
			{#if selected?.note}
				<p class="help">{selected.note}</p>
			{/if}
		</fieldset>
	{/if}

	<div class="result-area" aria-live="polite">
		{#if result && status}
			<div class="result {status.level} {deadline.kind}" data-testid="deadline-result">
				<p class="label">{i18n.t(`deadline.result.${deadline.kind}`)}</p>
				<p class="due" data-testid="due-date" data-date={result.due}>
					{i18n.date(result.due, 'full')}
				</p>
				<p class="relative">
					{#if status.level === 'passed'}
						{i18n.tn('deadline.ago', -status.daysLeft)}
					{:else if status.level === 'today'}
						{i18n.t('deadline.today')}
					{:else}
						{i18n.tn('deadline.fromToday', status.daysLeft)}
					{/if}
				</p>
				{#if status.level === 'passed' && deadline.kind === 'tenant_deadline'}
					<p class="notice danger"><Icon name="alert" /> {i18n.t('deadline.passedHelp')}</p>
				{:else if (status.level === 'today' || status.level === 'soon') && deadline.kind === 'tenant_deadline'}
					<p class="notice danger"><Icon name="alert" /> {i18n.t('deadline.soonHelp')}</p>
				{/if}
				<div class="button-row">
					<button
						type="button"
						class="button"
						onclick={addToCalendar}
						data-testid="add-to-calendar"
					>
						<Icon name="calendar" />
						{i18n.t('deadline.addToCalendar')}
					</button>
					<button type="button" class="button secondary" onclick={() => window.print()}>
						<Icon name="print" />
						{i18n.t('deadline.print')}
					</button>
				</div>
				<p class="small muted check">{i18n.t('deadline.check')}</p>

				<details>
					<summary>{i18n.t('deadline.howCounted')}</summary>
					<div class="counting">
						<p>{i18n.t('deadline.start', { date: day(result.trigger) })}</p>
						{#if result.addedDays > 0}
							<p>{i18n.tn('deadline.added', result.addedDays, { date: day(result.start) })}</p>
						{/if}
						{#if result.period.unit === 'court_days'}
							<p>{i18n.tn('deadline.countCourt', result.period.amount)}</p>
							<ol class="timeline">
								{#each timeline as row (row.date)}
									<li class:skipped={!row.counted}>
										<span>{day(row.date)}</span><span>{row.label}</span>
									</li>
								{/each}
							</ol>
						{:else if result.period.unit === 'calendar_days'}
							<p>{i18n.tn('deadline.countCalendar', result.period.amount)}</p>
						{:else if result.period.unit === 'months'}
							<p>{i18n.tn('deadline.countMonths', result.period.amount)}</p>
						{:else}
							<p>
								{i18n.t('deadline.countHours', {
									count: result.period.amount,
									date: day(result.due)
								})}
							</p>
						{/if}
						{#if result.movedFrom}
							<p>
								{i18n.t('deadline.moved', { from: day(result.movedFrom), to: day(result.due) })}
							</p>
							<ul>
								{#each result.moved as skip (skip.date)}
									<li>{day(skip.date)}: {reason(skip)}</li>
								{/each}
							</ul>
						{/if}
					</div>
				</details>
			</div>
		{:else}
			<p class="muted">{i18n.t('deadline.enterDate')}</p>
		{/if}
	</div>
</section>

<style>
	.calculator h2 {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.period {
		color: var(--muted);
	}

	input[type='date'] {
		max-width: 16rem;
	}

	.result-area {
		margin-top: 1.5rem;
	}

	.result {
		border-radius: var(--radius);
		padding: 1.25rem;
		background: var(--primary-soft);
		border: 2px solid var(--primary);
	}

	.result.tenant_deadline.soon,
	.result.tenant_deadline.today,
	.result.tenant_deadline.passed {
		background: var(--danger-soft);
		border-color: var(--danger);
	}

	.label {
		margin: 0;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-size: 0.85rem;
		color: var(--muted);
	}

	.due {
		margin: 0.15rem 0;
		font-size: clamp(1.5rem, 1.2rem + 1.6vw, 2.1rem);
		font-weight: 800;
		line-height: 1.2;
	}

	.relative {
		font-size: 1.1rem;
		font-weight: 600;
	}

	.result .notice {
		display: flex;
		gap: 0.5rem;
		align-items: flex-start;
	}

	.check {
		margin-top: 1rem;
	}

	.counting {
		margin-top: 0.75rem;
	}

	.timeline {
		margin: 0;
		padding: 0;
		list-style: none;
		font-size: 0.95rem;
	}

	.timeline li {
		display: grid;
		grid-template-columns: minmax(9rem, 12rem) 1fr;
		gap: 0.75rem;
		padding: 0.2rem 0;
		border-bottom: 1px dashed var(--border);
	}

	.timeline li.skipped {
		color: var(--muted);
	}

	@media print {
		.result {
			border: 2px solid #000;
			background: none;
		}

		details {
			display: block;
		}
	}
</style>
