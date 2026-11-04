<script lang="ts">
	import type { FieldValue } from '../engine/letters.ts';
	import type { LocalizedField } from '../engine/model.ts';
	import { useI18n } from '../i18n/index.ts';

	let {
		field,
		value = $bindable(),
		problem
	}: { field: LocalizedField; value: FieldValue | undefined; problem?: string } = $props();

	const i18n = useI18n();
	const id = $derived(`field-${field.id}`);
	const describedBy = $derived(
		[field.help ? `${id}-help` : null, problem ? `${id}-error` : null].filter(Boolean).join(' ') ||
			undefined
	);
	const asRadios = $derived(field.type === 'select' && (field.options?.length ?? 0) <= 4);
	const text = $derived(typeof value === 'string' ? value : '');

	function set(event: Event) {
		value = (event.currentTarget as HTMLInputElement).value;
	}
</script>

<div class="field" data-field={field.id}>
	{#if field.type === 'checkbox'}
		<label class="choice" for={id}>
			<input
				{id}
				type="checkbox"
				checked={value === true}
				onchange={(event) => (value = event.currentTarget.checked)}
				aria-describedby={describedBy}
			/>
			<span>{field.label}</span>
		</label>
		{#if field.help}<span class="help indent" id="{id}-help">{field.help}</span>{/if}
	{:else if asRadios}
		<fieldset aria-describedby={describedBy} class:invalid={!!problem}>
			<legend>
				{field.label}
				{#if field.required}<span class="required" aria-hidden="true">*</span><span
						class="visually-hidden">({i18n.t('letter.required')})</span
					>{/if}
			</legend>
			{#if field.help}<span class="help" id="{id}-help">{field.help}</span>{/if}
			{#each field.options ?? [] as option (option.value)}
				<label class="choice">
					<input
						type="radio"
						name={id}
						value={option.value}
						checked={value === option.value}
						onchange={() => (value = option.value)}
					/>
					<span>{option.label}</span>
				</label>
			{/each}
		</fieldset>
	{:else}
		<label for={id}>
			{field.label}
			{#if field.required}<span class="required" aria-hidden="true">*</span><span
					class="visually-hidden">({i18n.t('letter.required')})</span
				>{/if}
		</label>
		{#if field.help}<span class="help" id="{id}-help">{field.help}</span>{/if}
		{#if field.type === 'textarea'}
			<textarea
				{id}
				value={text}
				oninput={set}
				placeholder={field.placeholder}
				maxlength={field.maxLength}
				required={field.required}
				aria-invalid={problem ? true : undefined}
				aria-describedby={describedBy}
				rows="4"></textarea>
		{:else if field.type === 'select'}
			<select
				{id}
				value={text}
				onchange={set}
				required={field.required}
				aria-invalid={problem ? true : undefined}
				aria-describedby={describedBy}
			>
				<option value="">—</option>
				{#each field.options ?? [] as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		{:else}
			<input
				{id}
				type={field.type === 'money' || field.type === 'number' ? 'text' : field.type}
				inputmode={field.type === 'money'
					? 'decimal'
					: field.type === 'number'
						? 'numeric'
						: undefined}
				autocomplete={field.id === 'tenant_name'
					? 'name'
					: field.type === 'email'
						? 'email'
						: field.type === 'tel'
							? 'tel'
							: 'off'}
				value={text}
				oninput={set}
				placeholder={field.placeholder}
				maxlength={field.maxLength}
				required={field.required}
				aria-invalid={problem ? true : undefined}
				aria-describedby={describedBy}
				class:short={field.type === 'date' ||
					field.type === 'money' ||
					field.type === 'number' ||
					field.type === 'tel'}
			/>
		{/if}
	{/if}
	{#if problem}<p class="error" id="{id}-error">{problem}</p>{/if}
</div>

<style>
	.required {
		color: var(--danger);
		margin-inline-start: 0.2rem;
	}

	.indent {
		margin-inline-start: 2rem;
	}

	input.short {
		max-width: 16rem;
	}

	fieldset.invalid legend {
		color: var(--danger);
	}
</style>
