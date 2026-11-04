import { describe, expect, it } from 'vitest';
import {
	normalizeSegments,
	parseTemplate,
	renderTemplate,
	segmentsToText,
	templateNames,
	TemplateError,
	type RenderScope
} from '../../src/lib/engine/template.ts';

function scope(values: Record<string, string | boolean | undefined>): RenderScope {
	return {
		raw: (name) => values[name],
		text: (name) => {
			const value = values[name];
			return typeof value === 'string' && value !== '' ? value : undefined;
		},
		placeholder: (name) => `[${name}]`
	};
}

const render = (source: string, values: Record<string, string | boolean | undefined> = {}) =>
	segmentsToText(renderTemplate(source, scope(values)));

describe('template language', () => {
	it('inserts values and marks missing ones', () => {
		const segments = renderTemplate('Hello {{name}}, from {{city}}.', scope({ name: 'Ana' }));
		expect(segmentsToText(segments)).toBe('Hello Ana, from [city].');
		expect(segments).toContainEqual({ type: 'value', name: 'name', text: 'Ana', missing: false });
		expect(segments).toContainEqual({ type: 'value', name: 'city', text: '[city]', missing: true });
	});

	it('handles if / else / unless', () => {
		const source = '{{#if urgent}}Urgent.{{else}}Not urgent.{{/if}} {{#unless photos}}No photos.{{/unless}}';
		expect(render(source, { urgent: true })).toBe('Urgent. No photos.');
		expect(render(source, { urgent: false, photos: true })).toBe('Not urgent.');
		expect(render(source, { urgent: '' })).toBe('Not urgent. No photos.');
	});

	it('compares choices', () => {
		const source = '{{#if reason == "job"}}Job.{{/if}}{{#if reason != "job"}}Other.{{/if}}';
		expect(render(source, { reason: 'job' })).toBe('Job.');
		expect(render(source, { reason: 'medical' })).toBe('Other.');
		expect(render(source, {})).toBe('Other.');
	});

	it('removes lines that only hold a block tag', () => {
		const source = 'Start.\n\n{{#if a}}\nA is set.\n{{/if}}\n{{#if b}}\nB is set.\n{{/if}}\n\nEnd.';
		expect(render(source, { a: true, b: false })).toBe('Start.\n\nA is set.\n\nEnd.');
		expect(render(source, { a: false, b: false })).toBe('Start.\n\nEnd.');
		expect(render(source, { a: true, b: true })).toBe('Start.\n\nA is set. B is set.\n\nEnd.');
	});

	it('handles nested blocks and a block on the first line', () => {
		const source = '{{#if a}}\n{{#if b}}\nBoth.\n{{else}}\nOnly A.\n{{/if}}\n{{/if}}\nDone.';
		expect(render(source, { a: true, b: true })).toBe('Both. Done.');
		expect(render(source, { a: true })).toBe('Only A. Done.');
		expect(render(source, {})).toBe('Done.');
	});

	it('treats single line breaks as spaces but keeps paragraphs and value line breaks', () => {
		const source = 'Line one\ncontinues here.\n\nNew paragraph:\n\n{{list}}\n\nEnd.';
		expect(render(source, { list: '- one\n- two' })).toBe('Line one continues here.\n\nNew paragraph:\n\n- one\n- two\n\nEnd.');
	});

	it('ignores comments', () => {
		expect(render('A{{! a note }}B\n{{! whole line }}\nC')).toBe('AB C');
	});

	it('reports mistakes with a position', () => {
		expect(() => parseTemplate('{{#if a}}open')).toThrow(/never closed/);
		expect(() => parseTemplate('{{/if}}')).toThrow(TemplateError);
		expect(() => parseTemplate('{{#if a}}x{{/unless}}')).toThrow(/closes a/);
		expect(() => parseTemplate('{{#if a}}x{{else}}y{{else}}z{{/if}}')).toThrow(/Two/);
		expect(() => parseTemplate('{{else}}')).toThrow(/without/);
		expect(() => parseTemplate('{{ Bad Name }}')).toThrow(/understand/);
		expect(() => parseTemplate('text {{name')).toThrow(/Unclosed/);
		try {
			parseTemplate('abc {{nope!}}');
		} catch (error) {
			expect((error as TemplateError).offset).toBe(4);
		}
	});

	it('lists the names a template uses', () => {
		const names = templateNames(parseTemplate('{{a}} {{#if b == "x"}}{{c}}{{else}}{{d}}{{/if}}'));
		expect(names).toEqual([{ name: 'a' }, { name: 'b', compareValue: 'x' }, { name: 'c' }, { name: 'd' }]);
	});

	it('normalizes whitespace at the edges', () => {
		expect(normalizeSegments([{ type: 'text', text: '\n\n  Hi  ' }, { type: 'text', text: 'there\n\n\n\n' }])).toEqual([
			{ type: 'text', text: 'Hi there' }
		]);
	});
});
