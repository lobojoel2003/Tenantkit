/** Read every file under content/ into a { "relative/path.yaml": "text" } map. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ContentFiles } from '../src/lib/engine/loader.ts';

export const CONTENT_DIR = fileURLToPath(new URL('../content/', import.meta.url));

export function readContentFiles(dir: string = CONTENT_DIR): ContentFiles {
	const files: ContentFiles = {};
	const walk = (current: string) => {
		for (const name of readdirSync(current).sort()) {
			const path = join(current, name);
			if (statSync(path).isDirectory()) walk(path);
			else if (/\.ya?ml$/.test(name)) files[relative(dir, path).split(sep).join('/')] = readFileSync(path, 'utf8');
		}
	};
	walk(dir);
	return files;
}
