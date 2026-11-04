<script lang="ts">
	import type { RenderedLetter } from '../engine/letters.ts';
	import type { Segment } from '../engine/template.ts';

	let { letter, lang }: { letter: RenderedLetter; lang: string } = $props();

	function paragraphs(segments: Segment[]): Segment[][] {
		const result: Segment[][] = [[]];
		for (const segment of segments) {
			const parts = segment.text.split(/\n{2,}/);
			parts.forEach((part, index) => {
				if (index > 0) result.push([]);
				if (part !== '') result.at(-1)?.push({ ...segment, text: part });
			});
		}
		return result.filter((paragraph) => paragraph.length > 0);
	}
</script>

<!-- prettier-ignore -->
{#snippet text(segments: Segment[])}{#each segments as segment, index (index)}{#if segment.type === 'value'}<mark class:missing={segment.missing}>{segment.text}</mark>{:else}{segment.text}{/if}{/each}{/snippet}

<article class="letter-sheet" {lang} data-testid="letter-preview">
	<p class="block">
		{#each letter.sender as line, index (index)}
			{@render text(line)}<br />
		{/each}
	</p>
	<p>{@render text(letter.date)}</p>
	<p class="block">
		{#if letter.delivery}{@render text(letter.delivery)}<br />{/if}
		{#each letter.recipient as line, index (index)}
			{@render text(line)}<br />
		{/each}
	</p>
	<p class="subject">{@render text(letter.subject)}</p>
	{#each paragraphs(letter.body) as paragraph, index (index)}
		<p>{@render text(paragraph)}</p>
	{/each}
	<p class="closing">{letter.closing}</p>
	<p class="signature">{@render text(letter.signature)}</p>
</article>

<style>
	.letter-sheet {
		background: #fffdf8;
		color: #1a1a1a;
		font-family: var(--font-letter);
		font-size: 0.98rem;
		line-height: 1.55;
		padding: clamp(1.25rem, 4vw, 2.75rem);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		box-shadow: var(--shadow);
		overflow-wrap: anywhere;
	}

	.letter-sheet p {
		margin: 0 0 1em;
	}

	.subject {
		font-weight: 700;
	}

	.closing {
		margin-top: 1.5em;
		margin-bottom: 2.5em !important;
	}

	mark {
		white-space: pre-line;
		background: #fff1b8;
		color: inherit;
		border-radius: 3px;
		padding: 0 0.1em;
	}

	mark.missing {
		background: #fde3e0;
		color: #8a1c14;
		font-style: italic;
	}

	@media print {
		.letter-sheet {
			border: 0;
			box-shadow: none;
			padding: 0;
			font-size: 11pt;
			background: none;
		}

		mark,
		mark.missing {
			background: none;
			color: inherit;
			font-style: normal;
			padding: 0;
		}
	}
</style>
