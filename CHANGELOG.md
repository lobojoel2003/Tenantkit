# Changelog

All notable changes to Tenantkit are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-11-04

First public release.

### Added

- **Deadline calculator** that counts calendar days, court days (skipping weekends and each
  state's court holidays), months and hours, with questions for service method, a day-by-day
  "how we counted" breakdown, calendar (.ics) export and a print view.
- **Letter wizard** with a step-by-step form, live preview, validation, PDF download, print,
  copy and plain-text export. The letter can be written in a different language from the site.
- **Rules and letters for five states**, in English and Spanish, each linking to the law:
  - California: 3-day notice, 10-court-day eviction response, deposit, repairs, retaliation.
  - Florida: 3-day notice, 5-day answer and rent deposit, deposit claim and objection, repairs.
  - New York: 14-day rent demand, NYC Housing Court answer, deposit, retaliation.
  - Texas: notice to vacate under SB 38 (2026), eviction appeal, default set-aside, deposit,
    repairs, retaliation.
  - Washington: 14-day pay or vacate, repair start times, deposit, retaliation.
- **Shared letters** for any state: repair request, security deposit demand, payment plan.
- **Content engine**: YAML rules and templates validated against a schema, with file-and-line
  error messages, translation checks and generated JSON Schemas for editor autocompletion.
- **Contributor guide** for adding a state without writing code (`content/README.md`).
- **Privacy by design**: no accounts, analytics or cookies; a Content Security Policy blocks
  requests to any other server; answers are saved only if the person opts in.
- **Accessibility**: keyboard and screen reader support, checked with axe in end-to-end tests.
- **CI/CD**: lint, type-check, content validation, unit and end-to-end tests, CodeQL,
  Dependabot, GitHub Pages deployment and tagged releases with checksums, an SBOM and build
  provenance attestations.

### Notes

- All five states are marked **draft**: written by volunteers from official sources and not
  yet reviewed by a lawyer licensed in the state.

[Unreleased]: https://github.com/lobojoel2003/Tenantkit/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/lobojoel2003/Tenantkit/releases/tag/v1.0.0
