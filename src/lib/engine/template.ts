/**
 * A tiny, safe template language for letters.
 *
 *   {{tenant_name}}                       insert a value
 *   {{#if urgent}} … {{else}} … {{/if}}    show text only when a value is set
 *   {{#if reason == "job_loss"}} … {{/if}} compare a choice
 *   {{#unless photos}} … {{/unless}}       the opposite of #if
 *   {{! a note for other volunteers }}     comment, never shown
 *
 * Templates can't run code, so a letter file can never do anything except
 * produce text. A line that holds only a block tag is removed entirely, so
 * conditional paragraphs don't leave blank gaps behind. As in Markdown, a
 * single line break is treated as a space and a blank line starts a new
 * paragraph; line breaks inside values people type (addresses, lists) stay.
 */

export type Condition =
	| { kind: 'truthy'; name: string }
	| { kind: 'compare'; name: string; op: '==' | '!='; value: string };

export type TemplateNode =
	| { type: 'text'; text: string }
	| { type: 'var'; name: string }
	| { type: 'if'; condition: Condition; negate: boolean; then: TemplateNode[]; otherwise: TemplateNode[] };

export class TemplateError extends Error {
	constructor(
		message: string,
		readonly offset: number
	) {
		super(message);
		this.name = 'TemplateError';
	}
}

type Token =
	| { type: 'text'; text: string; offset: number }
	| { type: 'tag'; body: string; offset: number; standalone: boolean };

const TAG_RE = /\{\{([\s\S]*?)\}\}/g;
const NAME = '[a-z][a-z0-9_]*';
const VAR_RE = new RegExp(`^(${NAME})$`);
const IF_RE = new RegExp(`^#(if|unless)\\s+(${NAME})(?:\\s*(==|!=)\\s*"([^"]*)")?$`);

function isBlockTag(body: string): boolean {
	const trimmed = body.trim();
	return /^[#/!]/.test(trimmed) || trimmed === 'else';
}

function tokenize(source: string): Token[] {
	const tokens: Token[] = [];
	let last = 0;
	for (const match of source.matchAll(TAG_RE)) {
		const offset = match.index;
		if (offset > last) tokens.push({ type: 'text', text: source.slice(last, offset), offset: last });
		tokens.push({ type: 'tag', body: match[1] ?? '', offset, standalone: false });
		last = offset + match[0].length;
	}
	if (last < source.length) tokens.push({ type: 'text', text: source.slice(last), offset: last });

	const stray = source.slice(last).indexOf('{{');
	if (stray !== -1) throw new TemplateError('Unclosed "{{"', last + stray);

	// Standalone block tags: a line containing only one block tag (and spaces)
	// is removed, including its line break.
	const startsLine = new Map<Token, boolean>();
	for (const token of tokens) {
		if (token.type === 'text') startsLine.set(token, token.offset === 0 || source[token.offset - 1] === '\n');
	}
	for (let i = 0; i < tokens.length; i++) {
		const token = tokens[i];
		if (!token || token.type !== 'tag' || !isBlockTag(token.body)) continue;
		const before = tokens[i - 1];
		const after = tokens[i + 1];
		if ((before && before.type !== 'text') || (after && after.type !== 'text')) continue;

		let keepBefore = 0;
		if (before) {
			const newline = before.text.lastIndexOf('\n');
			const leading = before.text.slice(newline + 1);
			if (!/^[ \t]*$/.test(leading)) continue;
			if (newline === -1 && !startsLine.get(before)) continue;
			keepBefore = newline + 1;
		}
		let dropAfter = 0;
		if (after) {
			const newline = after.text.indexOf('\n');
			const trailing = newline === -1 ? after.text : after.text.slice(0, newline);
			if (!/^[ \t]*$/.test(trailing)) continue;
			if (newline === -1 && i + 1 !== tokens.length - 1) continue;
			dropAfter = newline === -1 ? after.text.length : newline + 1;
		}
		token.standalone = true;
		if (before) before.text = before.text.slice(0, keepBefore);
		if (after) {
			after.text = after.text.slice(dropAfter);
			startsLine.set(after, true);
		}
	}
	return tokens;
}

/** Parse a template into a tree. Throws TemplateError with an offset on mistakes. */
export function parseTemplate(source: string): TemplateNode[] {
	const tokens = tokenize(source);
	const root: TemplateNode[] = [];
	const stack: { node: Extract<TemplateNode, { type: 'if' }>; inElse: boolean; tag: 'if' | 'unless'; offset: number }[] = [];
	const current = (): TemplateNode[] => {
		const top = stack.at(-1);
		if (!top) return root;
		return top.inElse ? top.node.otherwise : top.node.then;
	};

	for (const token of tokens) {
		if (token.type === 'text') {
			if (token.text) current().push({ type: 'text', text: token.text });
			continue;
		}
		const body = token.body.trim();
		if (body.startsWith('!')) continue;

		const ifMatch = IF_RE.exec(body);
		if (ifMatch) {
			const [, tag, name, op, value] = ifMatch as unknown as [string, 'if' | 'unless', string, '==' | '!=' | undefined, string | undefined];
			const condition: Condition =
				op !== undefined ? { kind: 'compare', name, op, value: value ?? '' } : { kind: 'truthy', name };
			const node: Extract<TemplateNode, { type: 'if' }> = {
				type: 'if',
				condition,
				negate: tag === 'unless',
				then: [],
				otherwise: []
			};
			current().push(node);
			stack.push({ node, inElse: false, tag, offset: token.offset });
			continue;
		}
		if (body === 'else') {
			const top = stack.at(-1);
			if (!top) throw new TemplateError('{{else}} without an open {{#if}}', token.offset);
			if (top.inElse) throw new TemplateError('Two {{else}} tags in one block', token.offset);
			top.inElse = true;
			continue;
		}
		if (body === '/if' || body === '/unless') {
			const top = stack.pop();
			if (!top) throw new TemplateError(`{{${body}}} without an open block`, token.offset);
			if (`/${top.tag}` !== body) {
				throw new TemplateError(`{{${body}}} closes a {{#${top.tag}}} block`, token.offset);
			}
			continue;
		}
		const varMatch = VAR_RE.exec(body);
		if (varMatch?.[1]) {
			current().push({ type: 'var', name: varMatch[1] });
			continue;
		}
		throw new TemplateError(`Don't understand "{{${token.body}}}"`, token.offset);
	}

	const open = stack.at(-1);
	if (open) throw new TemplateError(`{{#${open.tag}}} is never closed`, open.offset);
	return root;
}

/** Every name a template refers to, with whether it is used in a comparison. */
export function templateNames(nodes: readonly TemplateNode[]): { name: string; compareValue?: string }[] {
	const names: { name: string; compareValue?: string }[] = [];
	const walk = (list: readonly TemplateNode[]) => {
		for (const node of list) {
			if (node.type === 'var') names.push({ name: node.name });
			else if (node.type === 'if') {
				names.push(
					node.condition.kind === 'compare'
						? { name: node.condition.name, compareValue: node.condition.value }
						: { name: node.condition.name }
				);
				walk(node.then);
				walk(node.otherwise);
			}
		}
	};
	walk(nodes);
	return names;
}

/** A piece of rendered output. Values are kept separate so a preview can highlight them. */
export type Segment =
	| { type: 'text'; text: string }
	| { type: 'value'; name: string; text: string; missing: boolean };

export interface RenderScope {
	/** Text to insert for a name. Return undefined when the person hasn't filled it in yet. */
	text(name: string): string | Segment[] | undefined;
	/** The raw value used by {{#if}} conditions. */
	raw(name: string): string | boolean | undefined;
	/** Placeholder shown for a missing value, e.g. "[Your full name]". */
	placeholder(name: string): string;
}

function test(condition: Condition, scope: RenderScope): boolean {
	const raw = scope.raw(condition.name);
	if (condition.kind === 'truthy') return raw !== undefined && raw !== false && raw !== '';
	const equal = String(raw ?? '') === condition.value;
	return condition.op === '==' ? equal : !equal;
}

export function renderNodes(nodes: readonly TemplateNode[], scope: RenderScope): Segment[] {
	const out: Segment[] = [];
	for (const node of nodes) {
		if (node.type === 'text') out.push({ type: 'text', text: node.text });
		else if (node.type === 'var') {
			const value = scope.text(node.name);
			if (Array.isArray(value)) out.push(...value);
			else if (value === undefined || value === '') {
				out.push({ type: 'value', name: node.name, text: scope.placeholder(node.name), missing: true });
			} else out.push({ type: 'value', name: node.name, text: value, missing: false });
		} else {
			const passed = test(node.condition, scope) !== node.negate;
			out.push(...renderNodes(passed ? node.then : node.otherwise, scope));
		}
	}
	return out;
}

/** Merge adjacent text, squeeze runs of blank lines, and trim the ends. */
export function normalizeSegments(segments: readonly Segment[]): Segment[] {
	const merged: Segment[] = [];
	for (const segment of segments) {
		const last = merged.at(-1);
		if (segment.type === 'text' && last?.type === 'text') last.text += segment.text;
		else merged.push({ ...segment });
	}
	for (const segment of merged) {
		if (segment.type !== 'text') continue;
		// In template text a single line break is just a space; a blank line starts a new
		// paragraph. Line breaks inside values people type (like addresses) are kept.
		segment.text = segment.text
			.replace(/(?<!\n)\n(?!\n)/g, ' ')
			.replace(/[ \t]{2,}/g, ' ')
			.replace(/[ \t]+\n/g, '\n')
			.replace(/\n[ \t]+/g, '\n')
			.replace(/\n{3,}/g, '\n\n');
	}
	const first = merged[0];
	if (first?.type === 'text') first.text = first.text.replace(/^\s+/, '');
	const last = merged.at(-1);
	if (last?.type === 'text') last.text = last.text.replace(/\s+$/, '');
	return merged.filter((segment) => segment.type !== 'text' || segment.text !== '');
}

export function segmentsToText(segments: readonly Segment[]): string {
	return segments.map((segment) => segment.text).join('');
}

/** Parse and render in one step. */
export function renderTemplate(source: string, scope: RenderScope): Segment[] {
	return normalizeSegments(renderNodes(parseTemplate(source), scope));
}
