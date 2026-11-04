/**
 * Builds a printable US-Letter PDF of a finished letter with pdf-lib.
 * Runs entirely in the browser; the letter never leaves the device.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import type { RenderedLetter } from '../engine/letters.ts';
import { segmentsToText, type Segment } from '../engine/template.ts';

export interface PdfOptions {
	title: string;
	author?: string;
	/** Language tag stored in the PDF, e.g. "en" or "es". */
	language: string;
	/** Footer text such as "Page {page} of {pages}". */
	pageLabel: (page: number, pages: number) => string;
	creator?: string;
	/** Fixed creation date (used by tests for reproducible output). */
	date?: Date;
}

const PAGE = { width: 612, height: 792 };
const MARGIN = { top: 72, bottom: 72, left: 72, right: 72 };
const SIZE = 11;
const LEADING = 15.5;

/** Map typographic characters to ones the built-in PDF fonts can draw (WinAnsi). */
const REPLACEMENTS: Record<string, string> = {
	'‘': "'",
	'’': "'",
	'‚': "'",
	'“': '"',
	'”': '"',
	'„': '"',
	'–': '-',
	'—': '-',
	'…': '...',
	' ': ' ',
	' ': ' ',
	' ': ' ',
	'•': '-',
	'‑': '-'
};

export function toPdfSafe(text: string, font: PDFFont): string {
	let out = '';
	for (const char of text.normalize('NFC')) {
		const replaced = REPLACEMENTS[char] ?? char;
		for (const piece of replaced) {
			try {
				font.encodeText(piece);
				out += piece;
			} catch {
				out += '?';
			}
		}
	}
	return out;
}

/** Break text into lines that fit `width`, keeping existing line breaks. */
export function wrapText(text: string, font: PDFFont, size: number, width: number): string[] {
	const lines: string[] = [];
	for (const paragraph of text.split('\n')) {
		if (paragraph.trim() === '') {
			lines.push('');
			continue;
		}
		let current = '';
		for (const word of paragraph.split(/(\s+)/)) {
			if (word === '') continue;
			const candidate = current + word;
			if (font.widthOfTextAtSize(candidate.trimEnd(), size) <= width) {
				current = candidate;
				continue;
			}
			if (current.trim() !== '') {
				lines.push(current.trimEnd());
				current = word.trimStart();
			} else {
				current = candidate.trimStart();
			}
			// A single word wider than the line: hard-break it.
			while (current.length > 1 && font.widthOfTextAtSize(current, size) > width) {
				let cut = current.length - 1;
				while (cut > 1 && font.widthOfTextAtSize(current.slice(0, cut), size) > width) cut--;
				lines.push(current.slice(0, cut));
				current = current.slice(cut);
			}
		}
		lines.push(current.trimEnd());
	}
	return lines;
}

interface Block {
	text: string;
	bold?: boolean;
	/** Blank space after the block, in lines. */
	after: number;
	/** Keep together on one page when possible. */
	keep?: boolean;
}

const text = (segments: readonly Segment[]) => segmentsToText(segments);
const lines = (block: readonly Segment[][]) => block.map((segments) => text(segments)).join('\n');

export function letterBlocks(letter: RenderedLetter): Block[] {
	const blocks: Block[] = [
		{ text: lines(letter.sender), after: 1, keep: true },
		{ text: text(letter.date), after: 1 },
		{
			text: [letter.delivery ? text(letter.delivery) : null, lines(letter.recipient)].filter(Boolean).join('\n'),
			after: 1,
			keep: true
		},
		{ text: text(letter.subject), bold: true, after: 1 }
	];
	const paragraphs = text(letter.body).split(/\n{2,}/);
	for (const paragraph of paragraphs) blocks.push({ text: paragraph, after: 1 });
	blocks.push({ text: `${letter.closing}\n\n\n${text(letter.signature)}`, after: 0, keep: true });
	return blocks;
}

export async function createLetterPdf(letter: RenderedLetter, options: PdfOptions): Promise<Uint8Array> {
	const pdf = await PDFDocument.create();
	const regular = await pdf.embedFont(StandardFonts.Helvetica);
	const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
	const date = options.date ?? new Date();

	pdf.setTitle(toPdfSafe(options.title, regular), { showInWindowTitleBar: true });
	if (options.author) pdf.setAuthor(toPdfSafe(options.author, regular));
	pdf.setCreator(options.creator ?? 'Tenantkit');
	pdf.setProducer('Tenantkit (pdf-lib)');
	pdf.setLanguage(options.language);
	pdf.setCreationDate(date);
	pdf.setModificationDate(date);

	const width = PAGE.width - MARGIN.left - MARGIN.right;
	const bottom = MARGIN.bottom;
	let page: PDFPage = pdf.addPage([PAGE.width, PAGE.height]);
	let y = PAGE.height - MARGIN.top;
	const newPage = () => {
		page = pdf.addPage([PAGE.width, PAGE.height]);
		y = PAGE.height - MARGIN.top;
	};

	for (const block of letterBlocks(letter)) {
		const font = block.bold ? bold : regular;
		const wrapped = wrapText(toPdfSafe(block.text, font), font, SIZE, width);
		const height = wrapped.length * LEADING;
		if (block.keep && y - height < bottom && height < PAGE.height - MARGIN.top - MARGIN.bottom) newPage();
		for (const line of wrapped) {
			if (y - LEADING < bottom) newPage();
			y -= LEADING;
			if (line !== '') page.drawText(line, { x: MARGIN.left, y, size: SIZE, font, color: rgb(0.08, 0.08, 0.08) });
		}
		y -= block.after * LEADING;
	}

	const pages = pdf.getPages();
	pages.forEach((current, index) => {
		const label = toPdfSafe(options.pageLabel(index + 1, pages.length), regular);
		const labelWidth = regular.widthOfTextAtSize(label, 8);
		current.drawText(label, {
			x: (PAGE.width - labelWidth) / 2,
			y: MARGIN.bottom / 2,
			size: 8,
			font: regular,
			color: rgb(0.4, 0.4, 0.4)
		});
	});

	return pdf.save({ useObjectStreams: true });
}
