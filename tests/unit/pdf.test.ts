import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import type { RenderedLetter } from '../../src/lib/engine/letters.ts';
import {
	createLetterPdf,
	letterBlocks,
	toPdfSafe,
	wrapText
} from '../../src/lib/pdf/letter-pdf.ts';

const t = (text: string) => [{ type: 'text' as const, text }];

function letter(body: string): RenderedLetter {
	return {
		sender: [t('Ana López'), t('1 Elm St')],
		date: t('4 de noviembre de 2026'),
		delivery: t('Por correo certificado'),
		recipient: [t('Sunrise Property Management'), t('500 Market St')],
		subject: t('Asunto: “Reparaciones” — urgente'),
		body,
		closing: 'Atentamente,',
		signature: t('Ana López')
	} as unknown as RenderedLetter & { body: never };
}

describe('PDF output', () => {
	it('replaces characters the built-in fonts cannot draw', async () => {
		const pdf = await PDFDocument.create();
		const font = await pdf.embedFont(StandardFonts.Helvetica);
		expect(toPdfSafe('“Hola” — ¿qué tal? ñ…', font)).toBe('"Hola" - ¿qué tal? ñ...');
		expect(toPdfSafe('Tiếng Việt 中文', font)).toBe('Ti?ng Vi?t ??');
	});

	it('wraps text to the line width', async () => {
		const pdf = await PDFDocument.create();
		const font = await pdf.embedFont(StandardFonts.Helvetica);
		const lines = wrapText('word '.repeat(60).trim() + '\n\nnext', font, 11, 200);
		expect(lines.length).toBeGreaterThan(5);
		for (const line of lines) expect(font.widthOfTextAtSize(line, 11)).toBeLessThanOrEqual(200);
		expect(lines.at(-2)).toBe('');
		expect(lines.at(-1)).toBe('next');
		expect(
			wrapText('x'.repeat(200), font, 11, 100).every(
				(line) => font.widthOfTextAtSize(line, 11) <= 100
			)
		).toBe(true);
	});

	it('splits the body into paragraphs', () => {
		const blocks = letterBlocks({ ...letter(''), body: t('One.\n\nTwo.') });
		expect(blocks.map((block) => block.text)).toContain('One.');
		expect(blocks.map((block) => block.text)).toContain('Two.');
		expect(blocks.find((block) => block.bold)?.text).toContain('Reparaciones');
	});

	it('creates a valid multi-page PDF with metadata', async () => {
		const long = Array.from(
			{ length: 40 },
			(_, index) => `Paragraph ${index + 1}. ` + 'Lorem ipsum dolor sit amet. '.repeat(6)
		).join('\n\n');
		const bytes = await createLetterPdf(
			{ ...letter(''), body: t(long) },
			{
				title: 'Solicitud de reparaciones',
				author: 'Ana López',
				language: 'es',
				pageLabel: (page, pages) => `Página ${page} de ${pages}`,
				date: new Date('2026-11-04T00:00:00Z')
			}
		);
		expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-');
		const loaded = await PDFDocument.load(bytes);
		expect(loaded.getPageCount()).toBeGreaterThan(1);
		expect(loaded.getTitle()).toBe('Solicitud de reparaciones');
		expect(loaded.getAuthor()).toBe('Ana López');
		expect(loaded.getPage(0).getSize()).toEqual({ width: 612, height: 792 });
	});
});
