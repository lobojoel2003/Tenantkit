# Security policy

## Supported versions

Security fixes are released for the latest minor version. The live site always runs the latest
`main`.

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |
| < 1.0   | No        |

## How Tenantkit protects people

- The site is static: there is no server-side code, database or account system to attack.
- What people type stays in their browser. Letters, PDFs and calendar files are made locally.
- Every page sets a strict Content Security Policy that blocks scripts, styles, fonts, images and
  connections from any other origin.
- Letter templates can only produce text; they cannot run code.
- Dependencies are audited in CI, updated weekly by Dependabot, and the code is scanned by CodeQL.
- Releases include checksums, an SBOM and signed build provenance attestations.

## Reporting a vulnerability

Please **don't open a public issue**. Use GitHub's private reporting instead:
**Security → Report a vulnerability** on this repository.

Include what you found, how to reproduce it and the impact you expect. We aim to acknowledge
reports within 5 days and to fix confirmed issues as quickly as we can, and we'll credit you in
the release notes unless you'd rather stay anonymous.

Mistakes in legal content (a wrong deadline or citation) aren't security issues, but they matter
just as much: please report them with the **Content correction** issue form.
