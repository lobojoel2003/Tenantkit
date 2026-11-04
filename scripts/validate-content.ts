/**
 * Check every content file. Run with:  npm run content:validate
 *
 *   --strict   treat warnings (like missing translations) as errors
 *   --quiet    only print problems
 */
import { LOCALE_CODES } from '../src/lib/i18n/config.ts';
import { formatIssue, loadContent } from '../src/lib/engine/loader.ts';
import { readContentFiles } from './content-files.ts';

const strict = process.argv.includes('--strict');
const quiet = process.argv.includes('--quiet');
const files = readContentFiles();
const { bundle, issues } = loadContent(files, { locales: LOCALE_CODES });

const inActions = process.env.GITHUB_ACTIONS === 'true';
for (const issue of issues) {
	console.log(formatIssue(issue));
	if (inActions) {
		const level = issue.level === 'error' || strict ? 'error' : 'warning';
		const line = issue.line !== undefined ? `,line=${issue.line}` : '';
		const message = `${issue.path ? `${issue.path}: ` : ''}${issue.message}`.replace(/\r?\n/g, ' ');
		console.log(`::${level} file=content/${issue.file}${line},title=Content check::${message}`);
	}
}

const errors = issues.filter((issue) => issue.level === 'error').length;
const warnings = issues.length - errors;

if (!quiet) {
	console.log('');
	for (const jurisdiction of bundle.jurisdictions) {
		console.log(
			`  ${jurisdiction.def.id.padEnd(12)} ${String(jurisdiction.deadlines.length).padStart(2)} deadlines  ${String(jurisdiction.letters.length).padStart(2)} letters  ${jurisdiction.def.status}`
		);
	}
	console.log(`\n${Object.keys(files).length} files checked: ${errors} error(s), ${warnings} warning(s)${strict ? ' (strict)' : ''}`);
}

if (errors > 0 || (strict && warnings > 0)) process.exit(1);
