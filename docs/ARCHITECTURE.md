# Architecture

Tenantkit is a static website generated from data files. This page explains how the pieces fit
together, for people changing the engine or the app. To write content, see
[content/README.md](../content/README.md) instead.

## Overview

```text
content/*.yaml ──► loader.ts ──► localize.ts ──► SvelteKit load() ──► prerendered HTML + JSON
   (data)         (validate,      (pick one         (build time only)          │
                   merge)          language)                                   ▼
                                                                  browser: deadlines.ts,
                                                                  letters.ts, letter-pdf.ts, ics.ts
```

- **Build time** (Node): `src/lib/server/content.ts` reads every YAML file with
  `import.meta.glob`, runs the loader, and throws if there are errors, so a broken content file can
  never be deployed. Each page's `+page.server.ts` returns only the data that page needs, already
  translated.
- **In the browser**: the deadline calculator and letter wizard use the pure engine modules.
  The PDF module (pdf-lib) is loaded only when someone downloads a PDF.

## Engine modules (`src/lib/engine/`)

All plain TypeScript with no framework or browser dependencies, so they're easy to test and reuse.

| Module          | Responsibility                                                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `schema.ts`     | zod schemas for every content file; source of the JSON Schemas in `schema/`                                                         |
| `civil-date.ts` | Date math on `YYYY-MM-DD` strings via day numbers. No time zones, no daylight-saving bugs                                           |
| `holidays.ts`   | Rule-based holiday calendars (`nth` weekday, fixed date with weekend observance, `since`/`until`)                                   |
| `deadlines.ts`  | Counting calendar days, court days, months and hours; service adjustments; weekend extension                                        |
| `template.ts`   | The letter template language: tokenizer, parser, renderer, and name extraction for validation                                       |
| `letters.ts`    | Field defaults, visibility (`show_if`), validation, value formatting, computed dates, layout                                        |
| `loader.ts`     | Parses YAML with line numbers, validates, merges shared letters with state overrides, checks references, translations and templates |
| `localize.ts`   | Turns merged content into one language, tracking where English was used as a fallback                                               |
| `model.ts`      | The JSON-friendly shapes sent to pages                                                                                              |
| `ics.ts`        | RFC 5545 calendar files with reminders                                                                                              |

`src/lib/pdf/letter-pdf.ts` lays out a US-Letter PDF with the standard Helvetica fonts, wrapping
text and keeping blocks together across pages.

### Counting rules

`computeDeadline()` never counts the start day. For `court_days` it walks forward one day at a time,
counting only weekdays that aren't holidays in the jurisdiction's calendar, and records every
skipped day so the UI can show its work. `extend_if_closed` then moves a last day that falls on a
weekend or holiday forward. Choices in a deadline's `options` can add calendar days before counting
(`add_days`, e.g. service by mail) or replace the period.

### Template language

Deliberately tiny: values (`{{name}}`), conditionals (`{{#if}}`, `{{#unless}}`, `{{else}}`,
`== "value"` and `!= "value"` for selects) and comments. There are no loops, expressions or
helpers, so templates are safe to accept from anyone and easy for non-programmers to read. A line
holding only a block tag is removed. Single line breaks in template text become spaces and blank
lines start paragraphs; line breaks inside answers are kept. Rendering returns _segments_ rather
than a string, so the preview can highlight answers and placeholders.

### Validation

`loadContent()` collects every problem instead of stopping at the first one, with the file, line
and YAML path. Beyond the schema it checks:

- ids match file and folder names, and are unique
- references resolve: extended letters, fieldsets, holiday calendars, deadlines used by computed
  dates, letters linked from deadlines
- templates parse, use only known names, don't insert checkboxes directly, and compare selects only
  to valid options
- every translatable text has every site language (warning; `--strict` in CI makes it an error), and
  translations use the same template names as English
- deadlines that count court days have a holiday calendar

## Pages (`src/routes/`)

| Route                                   | Page                                    |
| --------------------------------------- | --------------------------------------- |
| `/`                                     | Picks the browser's language            |
| `/[lang]/`                              | Home: choose a state                    |
| `/[lang]/[state]/`                      | Topics, legal help, holidays, sources   |
| `/[lang]/[state]/[topic]/`              | Deadlines and letters for a topic       |
| `/[lang]/[state]/deadlines/[deadline]/` | Deadline calculator                     |
| `/[lang]/[state]/letters/[letter]/`     | Letter wizard                           |
| `/[lang]/about/`                        | About, privacy, licenses                |
| `/build-info.json`                      | Version, build number, commit, coverage |

Route parameters are matched in `src/params.ts`. Every route is prerendered (`entries()` lists all
combinations), and `trailingSlash: 'always'` produces `…/index.html` files that any static host
serves. Links are built with typed helpers in `src/lib/paths.ts`.

## Internationalization

- Interface strings: `src/lib/i18n/locales/<code>.json`, flat keys, `{placeholders}`, and
  `.one`/`.other` plural forms chosen with `Intl.PluralRules`. `useI18n()` gives components `t()`,
  `tn()` and `date()`.
- Content strings: inline in YAML next to English; `localize.ts` picks the page language and falls
  back to English, and pages say when that happened.
- Letters are offered in every language they're fully translated into, independent of the site
  language.
- Dates use `Intl.DateTimeFormat`. Money uses the jurisdiction's country (e.g. `es-US` gives
  `$1,500.00`).

### Adding a language

1. Add it to `LOCALES` in `src/lib/i18n/config.ts`.
2. Copy `src/lib/i18n/locales/en.json` to `<code>.json`, translate it, and register it in
   `src/lib/i18n/index.ts`.
3. Add translations to content files (`npm run content:validate` lists what's missing).
4. For scripts outside Latin-1 (e.g. Vietnamese, Chinese), PDF output needs an embedded font: the
   built-in PDF fonts only cover Western European characters, and other characters are replaced.
   Printing from the browser works for any language.

## Security model

- No server code at runtime. `hooks.server.ts` only sets `<html lang>` during prerendering.
- CSP (configured in `vite.config.ts`, emitted as a `<meta>` tag with script hashes) allows only
  same-origin resources, and `connect-src 'self'`.
- Answers live in component state, and in `localStorage` only when the person opts in.
- External links use `rel="external noopener"`; the referrer policy is `no-referrer`.

## Build metadata

`vite.config.ts` defines `__TENANTKIT_BUILD__` with the package version, the build number (the
commit count, or `BUILD_NUMBER` if set), the short commit hash, and the build date. It appears in
the footer, the about page, `build-info.json`, and the PDF's creator field.
