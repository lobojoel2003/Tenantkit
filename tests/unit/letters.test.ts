import { describe, expect, it } from 'vitest';
import { HolidayCalendar } from '../../src/lib/engine/holidays.ts';
import {
	computedDate,
	hasMissingValues,
	initialValues,
	isFieldVisible,
	letterToText,
	parseMoney,
	renderLetter,
	validateValues
} from '../../src/lib/engine/letters.ts';
import type { LocalizedLetter } from '../../src/lib/engine/model.ts';

const calendar = new HolidayCalendar([]);
const context = { locale: 'en', calendar, currency: 'USD', jurisdictionName: 'Testland', today: '2026-11-04' };

const letter: LocalizedLetter = {
	id: 'deposit-demand',
	topic: 'deposit',
	title: 'Deposit',
	summary: '',
	fields: [
		{ id: 'tenant_name', type: 'text', section: 'you', label: 'Your name', required: true },
		{ id: 'rental_address', type: 'text', section: 'you', label: 'Rental address', required: true },
		{ id: 'tenant_address', type: 'textarea', section: 'you', label: 'Mailing address', required: false },
		{ id: 'tenant_email', type: 'email', section: 'you', label: 'Email', required: false },
		{ id: 'landlord_name', type: 'text', section: 'landlord', label: 'Landlord', required: true },
		{ id: 'landlord_address', type: 'textarea', section: 'landlord', label: 'Landlord address', required: true },
		{ id: 'letter_date', type: 'date', section: 'sending', label: 'Date', required: true, default: 'today' },
		{
			id: 'delivery_method',
			type: 'select',
			section: 'sending',
			label: 'How',
			required: false,
			default: 'certified_mail',
			options: [
				{ value: 'certified_mail', label: 'By certified mail' },
				{ value: 'email', label: 'By email' }
			]
		},
		{ id: 'move_out_date', type: 'date', section: 'details', label: 'Move-out date', required: true },
		{ id: 'deposit_amount', type: 'money', section: 'details', label: 'Deposit', required: true },
		{ id: 'disputed', type: 'checkbox', section: 'details', label: 'Disputed', required: false },
		{ id: 'disputed_details', type: 'textarea', section: 'details', label: 'Which charges', required: true, showIf: { field: 'disputed', equals: true } }
	],
	params: { law: 'The law of {{jurisdiction_name}} says the deadline was {{deadline}}.', empty: '' },
	computed: {
		deadline: { from: 'move_out_date', period: { amount: 21, unit: 'calendar_days' }, addDays: 0, extendIfClosed: false },
		respond_by: { from: 'letter_date', period: { amount: 14, unit: 'calendar_days' }, addDays: 0, extendIfClosed: false }
	},
	subject: 'Re: Deposit for {{rental_address}}',
	body: 'I moved out on {{move_out_date}}.\nMy deposit was {{deposit_amount}}.\n\n{{law}}{{empty}}\n\n{{#if disputed}}\nI dispute: {{disputed_details}}\n{{/if}}\nPlease pay by {{respond_by}}.',
	closing: 'Sincerely,',
	deliveryTips: [],
	checklist: [],
	citations: [],
	untranslated: false
};

describe('letters', () => {
	it('fills in defaults', () => {
		expect(initialValues(letter, '2026-11-04')).toEqual({
			letter_date: '2026-11-04',
			delivery_method: 'certified_mail',
			disputed: false
		});
	});

	it('reads money amounts', () => {
		expect(parseMoney('1500')).toBe(1500);
		expect(parseMoney('$1,500.50')).toBe(1500.5);
		expect(parseMoney('1.500,50')).toBe(1500.5);
		expect(parseMoney('abc')).toBeNull();
	});

	it('validates answers, skipping hidden fields', () => {
		const values = { ...initialValues(letter, '2026-11-04'), tenant_email: 'not-an-email', deposit_amount: 'lots' };
		const problems = validateValues(letter, values);
		expect(problems).toMatchObject({
			tenant_name: 'required',
			move_out_date: 'required',
			tenant_email: 'invalid_email',
			deposit_amount: 'invalid_money'
		});
		expect(problems.disputed_details).toBeUndefined();
		expect(validateValues(letter, { ...values, disputed: true }).disputed_details).toBe('required');
	});

	it('shows fields only when their condition is met', () => {
		const field = letter.fields.find((candidate) => candidate.id === 'disputed_details');
		expect(field && isFieldVisible(field, { disputed: true }, letter.fields)).toBe(true);
		expect(field && isFieldVisible(field, { disputed: false }, letter.fields)).toBe(false);
	});

	it('computes dates from answers', () => {
		expect(computedDate(letter, 'deadline', { move_out_date: '2026-10-01' }, context)).toBe('2026-10-22');
		expect(computedDate(letter, 'deadline', {}, context)).toBeUndefined();
		expect(computedDate(letter, 'nope', {}, context)).toBeUndefined();
	});

	it('renders a complete letter', () => {
		const rendered = renderLetter(
			letter,
			{
				tenant_name: 'Ana López',
				rental_address: '1 Elm St, Apt 2, Springfield, ST 12345',
				tenant_address: '9 Oak Ave\nShelbyville, ST 12346',
				tenant_email: 'ana@example.org',
				landlord_name: 'Sunrise Property Management',
				landlord_address: '500 Market St\nSpringfield, ST 12345',
				letter_date: '2026-11-04',
				delivery_method: 'certified_mail',
				move_out_date: '2026-10-01',
				deposit_amount: '1500',
				disputed: true,
				disputed_details: 'Carpet cleaning'
			},
			context
		);
		expect(hasMissingValues(rendered)).toBe(false);
		expect(letterToText(rendered)).toBe(
			[
				'Ana López',
				'9 Oak Ave',
				'Shelbyville, ST 12346',
				'ana@example.org',
				'',
				'November 4, 2026',
				'',
				'By certified mail',
				'Sunrise Property Management',
				'500 Market St',
				'Springfield, ST 12345',
				'',
				'Re: Deposit for 1 Elm St, Apt 2, Springfield, ST 12345',
				'',
				'I moved out on October 1, 2026. My deposit was $1,500.00.',
				'',
				'The law of Testland says the deadline was October 22, 2026.',
				'',
				'I dispute: Carpet cleaning Please pay by November 18, 2026.',
				'',
				'Sincerely,',
				'',
				'',
				'Ana López',
				''
			].join('\n')
		);
	});

	it('uses the rental address when there is no separate mailing address, and shows placeholders', () => {
		const rendered = renderLetter(letter, { rental_address: '1 Elm St', letter_date: '2026-11-04' }, context);
		const text = letterToText(rendered);
		expect(text.startsWith('[Your name]\n1 Elm St\n\nNovember 4, 2026')).toBe(true);
		expect(text).toContain('the deadline was […]');
		expect(hasMissingValues(rendered)).toBe(true);
	});

	it('formats in Spanish', () => {
		const rendered = renderLetter(letter, { move_out_date: '2026-10-01', deposit_amount: '1500', letter_date: '2026-11-04' }, { ...context, locale: 'es' });
		const text = letterToText(rendered);
		expect(text).toContain('1 de octubre de 2026');
		expect(text).toMatch(/1500,00\sUS\$|US\$\s?1500,00|1\.500,00\sUS\$/);
	});
});
