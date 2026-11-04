/**
 * Print the CHANGELOG.md section for a version (used as GitHub release notes).
 *   npm run --silent release:notes -- 1.0.0
 */
import { readFileSync } from 'node:fs';

const version = (process.argv[2] ?? '').replace(/^v/, '');
if (!version) {
	console.error('usage: release-notes <version>');
	process.exit(2);
}

const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const lines = changelog.split('\n');
const start = lines.findIndex((line) => line.startsWith(`## [${version}]`));
if (start === -1) {
	console.error(`CHANGELOG.md has no "## [${version}]" section`);
	process.exit(1);
}
const end = lines.findIndex((line, index) => index > start && /^## \[/.test(line));
const body = lines
	.slice(start + 1, end === -1 ? undefined : end)
	.filter((line) => !/^\[[^\]]+\]: /.test(line))
	.join('\n')
	.trim();

const repo = 'https://github.com/lobojoel2003/Tenantkit';
console.log(`${body}

---

**Downloads**

- \`tenantkit-site-v${version}.zip\`: the static website. Unzip and host it on any static web server.
- \`tenantkit-content-v${version}.zip\`: the rules, letters, holiday calendars and JSON Schemas (CC BY 4.0), for legal aid groups and other tools.
- \`tenantkit-sbom-v${version}.cdx.json\`: software bill of materials (CycloneDX).
- \`SHA256SUMS.txt\`: checksums. Each file also has a signed build provenance attestation (\`gh attestation verify <file> --repo lobojoel2003/Tenantkit\`).

Code: AGPL-3.0-only. Content: CC BY 4.0. Full changelog: ${repo}/blob/v${version}/CHANGELOG.md`);
