/**
 * Write JSON Schemas for the content files to schema/. Editors such as VS Code
 * (with the YAML extension) use them for autocompletion and inline errors.
 *
 *   npm run content:schema            write the files
 *   npm run content:schema -- --check fail if they are out of date (used in CI)
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
	DeadlinesFile,
	FieldsetFile,
	HolidayCalendarFile,
	JurisdictionFile,
	LetterFile
} from '../src/lib/engine/schema.ts';

const outDir = fileURLToPath(new URL('../schema/', import.meta.url));
const schemas = {
	'jurisdiction.schema.json': [
		JurisdictionFile,
		'Tenantkit jurisdiction',
		'content/jurisdictions/<id>/jurisdiction.yaml'
	],
	'deadlines.schema.json': [
		DeadlinesFile,
		'Tenantkit deadlines',
		'content/jurisdictions/<id>/deadlines.yaml'
	],
	'letter.schema.json': [
		LetterFile,
		'Tenantkit letter',
		'content/letters/*.yaml and content/jurisdictions/<id>/letters/*.yaml'
	],
	'fieldset.schema.json': [FieldsetFile, 'Tenantkit fieldset', 'content/fieldsets/*.yaml'],
	'holidays.schema.json': [
		HolidayCalendarFile,
		'Tenantkit holiday calendar',
		'content/holidays/*.yaml'
	]
} as const;

const check = process.argv.includes('--check');
let stale = 0;
mkdirSync(outDir, { recursive: true });
for (const [file, [schema, title, applies]] of Object.entries(schemas)) {
	const json = {
		$id: `https://lobojoel2003.github.io/Tenantkit/schema/${file}`,
		title,
		description: `Schema for ${applies}. Generated from src/lib/engine/schema.ts; do not edit by hand.`,
		...z.toJSONSchema(schema, { io: 'input', target: 'draft-2020-12' })
	};
	const text = JSON.stringify(json, null, '\t') + '\n';
	const path = outDir + file;
	if (check) {
		let current = '';
		try {
			current = readFileSync(path, 'utf8');
		} catch {
			// missing file counts as stale
		}
		if (current !== text) {
			console.error(`schema/${file} is out of date. Run: npm run content:schema`);
			stale++;
		}
	} else {
		writeFileSync(path, text);
		console.log(`wrote schema/${file}`);
	}
}
if (stale > 0) process.exit(1);
