# Contributing to Tenantkit

Thank you for helping renters. There are many ways to help, and most of them don't need code.

- [Ways to contribute](#ways-to-contribute)
- [Adding or fixing a state](#adding-or-fixing-a-state)
- [Reviewing a state](#reviewing-a-state)
- [Translating](#translating)
- [Working on the code](#working-on-the-code)
- [Pull requests](#pull-requests)
- [Licensing of contributions](#licensing-of-contributions)

**If you need legal help, please don't open an issue.** The site lists free legal help for each
state, and [LawHelp.org](https://www.lawhelp.org/) can find legal aid near you.

## Ways to contribute

| You are…                        | You can…                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------- |
| A tenant or organizer           | Tell us what was confusing, or what letter you wished existed (open an issue) |
| A legal aid worker or volunteer | Add your state, correct a rule, improve a letter                              |
| A lawyer licensed in a state    | Review that state's rules and mark it reviewed                                |
| A translator                    | Translate the interface and content, or check existing translations           |
| A developer or designer         | Improve the engine, accessibility, performance or design                      |

## Adding or fixing a state

Everything is in `content/`. The **[content guide](content/README.md)** explains each file.

1. Fork the repository and create a branch, e.g. `content/us-or`.
2. Copy the closest state folder in `content/jurisdictions/` and edit it.
3. Run `npm run content:validate` and fix anything it reports (it gives file and line numbers).
4. Run `npm run dev` and check your pages in English and Spanish.
5. Open a pull request using the template. **List your sources**, and say anything you were
   unsure about.

Rules for content:

- Every deadline must cite the official statute or court rule, preferably on the legislature's or
  court's own website.
- New or changed states start as `status: draft`. Update `last_reviewed` whenever you check the
  rules against the law.
- When the law is unclear, choose the reading that gives the tenant the **earliest** date, and say
  so in the explanation.
- Write in plain language (6th–8th grade). See [Writing style](content/README.md#writing-style).

No Node.js? You can edit files on GitHub and open a pull request; the same checks run there and
point to any problems.

## Reviewing a state

A state can be marked `reviewed` only by, or on behalf of, a lawyer licensed in that state (for
example, a legal aid organization's housing unit). To review:

1. Check each deadline, citation and letter paragraph against current law and local practice.
2. Open a pull request with your corrections that sets `status: reviewed`, `last_reviewed` to the
   review date, and `reviewed_by` to the person or organization, e.g.
   `reviewed_by: ["Example Legal Aid Society, Housing Unit"]`.
3. In the pull request, confirm that you are, or are acting for, a lawyer licensed in the state.

Reviews describe the rules as of the review date; they are not legal advice to any user. Maintainers
may ask for a follow-up review after major changes in the law.

## Translating

- **Interface text:** `src/lib/i18n/locales/<code>.json`. Copy `en.json`, translate the values, and
  keep every `{placeholder}` exactly as it is.
- **Content text:** add your language next to `en:` in each YAML text block.
- To add a new language to the site, see
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#adding-a-language).

Tests fail if a translation is missing a key or changes a placeholder, so you'll know if anything
was missed.

## Working on the code

Requirements: Node.js 22+.

```bash
npm install
```

```bash
npm run dev
```

Before opening a pull request, run the same checks as CI:

```bash
npm run verify
```

```bash
npx playwright install chromium && npm run test:e2e
```

Conventions:

- TypeScript everywhere, strict mode. Svelte 5 with runes.
- The engine in `src/lib/engine/` is plain TypeScript with no browser or framework dependencies,
  and must stay fully unit-tested. Dates are `YYYY-MM-DD` strings; never use `Date` for day math.
- Keep the site static and private: no network requests to other hosts, no analytics, no
  third-party scripts or fonts. The Content Security Policy enforces this.
- Every interface string goes through `useI18n()`, in every language file.
- Accessibility is a requirement, not a nice-to-have: labels, focus order, contrast, and keyboard
  support. The end-to-end tests run axe.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the pieces fit together.

## Pull requests

- Use [Conventional Commits](https://www.conventionalcommits.org/) for titles, e.g.
  `feat(content): add Oregon`, `fix(engine): count court days across new year`,
  `docs: clarify holiday rules`.
- Keep pull requests focused. One state per pull request is easiest to review.
- Add or update tests for engine changes.
- Add a line to the `Unreleased` section of [CHANGELOG.md](CHANGELOG.md) for anything users will
  notice.

## Licensing of contributions

By contributing, you agree that:

- your **code** contributions are licensed under the [GNU AGPL v3.0](LICENSE), and
- your **content** contributions (anything in `content/`) are licensed under
  [CC BY 4.0](content/LICENSE.md).

Only contribute material you have the right to share. Don't paste text from copyrighted guides;
statutes and court rules may be quoted and cited.
