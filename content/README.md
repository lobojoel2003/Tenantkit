# Tenantkit content: rules and letter templates

Everything in this folder is plain YAML that anyone can read and edit: the
deadlines for each state, the letters tenants can send, and the holidays courts
close for. You don't need to know how to code to add a state or improve a letter.

This folder is licensed under **[CC BY 4.0](LICENSE.md)**, separately from the
app's code (AGPL-3.0). Legal aid groups, tenant unions and anyone else may copy,
adapt and republish these templates, including in their own tools, as long as
they give credit (see [How to give credit](#how-to-give-credit)).

> **Not legal advice.** These files summarize laws in plain language. Laws
> change and courts read them differently. Every jurisdiction says whether a
> lawyer licensed there has reviewed it (`status: reviewed`) or not
> (`status: draft`), and the app shows that on every page.

## Contents

- [Folder layout](#folder-layout)
- [Add your state in 6 steps](#add-your-state-in-6-steps)
- [Writing style](#writing-style)
- [jurisdiction.yaml](#jurisdictionyaml)
- [deadlines.yaml](#deadlinesyaml)
- [Letters](#letters)
- [Template language](#template-language)
- [Holidays](#holidays)
- [Translations](#translations)
- [Checking your work](#checking-your-work)
- [How to give credit](#how-to-give-credit)

## Folder layout

```text
content/
├── fieldsets/            Questions shared by every letter (tenant, landlord, sending)
├── holidays/             Holiday calendars, e.g. us-federal.yaml
├── letters/              Shared letters that work in any state
└── jurisdictions/
    ├── us-general/       "Other U.S. states": shared letters, no deadlines
    └── us-ca/            One folder per state (or city, or county)
        ├── jurisdiction.yaml   Name, review status, legal help, holidays, letters offered
        ├── deadlines.yaml      Deadline rules with citations
        └── letters/            State versions of letters (usually extend a shared one)
            ├── deposit-demand.yaml
            └── repair-request.yaml
```

Folder and file names are the ids: `jurisdictions/us-ca/` must contain
`id: us-ca`, and `letters/deposit-demand.yaml` must contain `id: deposit-demand`.

## Add your state in 6 steps

1. **Copy a folder.** Copy `jurisdictions/us-wa/` (or the state closest to yours)
   to `jurisdictions/us-<your state code>/`, e.g. `us-or`.
2. **Edit `jurisdiction.yaml`.** Set the id, name, `status: draft`, today's date
   in `last_reviewed`, and statewide legal help.
3. **Write `deadlines.yaml`.** One entry per deadline, each with at least one
   citation that links to the official text of the law.
4. **Adapt the letters.** Usually you only change the `law:` paragraph that says
   what your state's law requires.
5. **Run the checker:** `npm run content:validate`. It tells you the file and
   line of anything that needs fixing.
6. **Open a pull request.** Say which sources you used. A maintainer will help
   with anything technical. A lawyer licensed in the state can later review it
   and change the status to `reviewed`.

No Node.js? Open a pull request anyway: the checks run automatically on GitHub
and show the same messages.

## Writing style

People use Tenantkit when they're stressed, often on a phone, often in their
second language. Write for them.

- **Plain words, short sentences.** Aim for a 6th–8th grade reading level.
  "Your landlord must return your deposit within 21 days" beats "The lessor
  shall remit the security deposit no later than 21 days."
- **Say "you" and "your landlord".**
- **Lead with what to do.** Put the action first and the explanation second.
- **Be honest about uncertainty.** If courts disagree, or something depends on
  facts we can't know, say so and point to legal help.
- **When unsure, pick the safer date for the tenant.** For deadlines the tenant
  must meet, choose the reading that gives the *earliest* date, and say so in
  the explanation.
- **Cite the law.** Every deadline needs at least one `citations` entry that
  links to the official statute or court rule. Prefer the legislature's or
  court's own site.
- **Don't promise outcomes.** Say "may", "can ask", "a court can order".
- **Letters should be firm and polite.** They may be read by a judge later.

## jurisdiction.yaml

```yaml
# yaml-language-server: $schema=../../../schema/jurisdiction.schema.json
schema_version: 1
id: us-wa                      # country code + state code, lowercase
name: { en: Washington, es: Washington }
short_name: WA
country: US
kind: state                    # general | state | county | city
status: draft                  # draft | reviewed (only a licensed lawyer sets "reviewed")
last_reviewed: 2026-11-04      # when someone last checked these rules
reviewed_by: []                # e.g. ["Example Legal Aid Society"]
maintainers: []                # GitHub usernames who look after this folder
summary:
  en: One or two sentences about what's covered here.
  es: …
letters: [repair-request, deposit-demand, payment-plan]   # letters offered here
holidays:                      # needed if any deadline uses court_days or extend_if_closed
  extends: [us-federal]
  remove: [columbus-day]       # holidays courts here stay open for
  add:
    - id: native-american-day
      name: { en: Native American Day, es: Día del Indígena Americano }
      date: { month: 9, weekday: fri, nth: 4 }
  note: { en: Which holidays we skip and why., es: … }
  sources:
    - label: RCW 1.16.050
      url: https://app.leg.wa.gov/RCW/default.aspx?cite=1.16.050
help:                          # free legal help, statewide if possible
  - name: Northwest Justice Project — CLEAR hotline
    url: https://nwjustice.org/get-legal-help
    phone: "1-888-201-1014"    # quote phone numbers
    description: { en: …, es: … }
    topics: [eviction]         # optional: eviction | repairs | deposit
sources: []                    # general guides about tenant law here
```

## deadlines.yaml

```yaml
# yaml-language-server: $schema=../../../schema/deadlines.schema.json
schema_version: 1
deadlines:
  - id: deposit-return                 # unique within the state
    topic: deposit                     # eviction | repairs | deposit
    kind: landlord_deadline            # see below
    urgent: false                      # true shows it first, in red
    title: { en: Your landlord must return your deposit, es: … }
    summary: { en: One sentence shown in lists., es: … }
    trigger: { en: The day you moved out, es: … }   # label for the date the person enters
    period: { amount: 21, unit: calendar_days }
    extend_if_closed: false            # move a last day that's a weekend/holiday to the next court day
    explanation: { en: What the date means, in plain words., es: … }
    if_missed: { en: What happens if the deadline passes., es: … }
    steps:                             # what to do now, in order
      - { en: …, es: … }
    letters: [deposit-demand]          # letters that help (must be offered in jurisdiction.yaml)
    citations:
      - label: Cal. Civ. Code § 1950.5(g)
        url: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1950.5
```

**`kind`** controls how the app words the result:

| kind                | Meaning                                          | Example                      |
| ------------------- | ------------------------------------------------ | ---------------------------- |
| `tenant_deadline`   | You must act by this date                        | Respond to an eviction case  |
| `landlord_deadline` | Your landlord must act by this date              | Return the deposit           |
| `waiting_period`    | The earliest date something can happen           | Landlord can file in court   |
| `protection_period` | You are protected until this date                | No retaliation after a complaint |

**`period.unit`**:

| unit            | Counts                                                                 |
| --------------- | ---------------------------------------------------------------------- |
| `calendar_days` | Every day                                                              |
| `court_days`    | Only weekdays that aren't holidays in this state's `holidays` list     |
| `months`        | Calendar months (Jan 31 + 1 month = Feb 28)                            |
| `hours`         | Rounded up to whole days (24 hours from Monday = Tuesday)              |

The day of the event is never counted; the last day is. `extend_if_closed: true`
moves a last day that falls on a weekend or holiday to the next day that isn't.

**Questions that change the deadline.** Some deadlines depend on a fact, such as
how court papers were delivered. Add `options`; the first choice is the default:

```yaml
    options:
      id: service
      question: { en: How did you get the papers?, es: … }
      choices:
        - id: personal
          label: { en: Someone handed them to me, es: … }
        - id: substituted
          label: { en: They were left with someone else and mailed, es: … }
          add_days: 10                 # calendar days added before counting starts
          note: { en: Why the extra days., es: … }
        - id: no_heat
          label: { en: No heat or water, es: … }
          period: { amount: 24, unit: hours }   # a different period for this choice
```

## Letters

Shared letters in `content/letters/` work in any state. A state adapts one by
creating `jurisdictions/<id>/letters/<letter id>.yaml` that **extends** it. Only
write what's different; everything else comes from the shared letter:

```yaml
# yaml-language-server: $schema=../../../../schema/letter.schema.json
schema_version: 1
id: deposit-demand
extends: deposit-demand
params:
  law:
    en: >-
      Under California Civil Code section 1950.5, you had 21 days after I moved out to return
      my deposit or send an itemized statement of deductions. That deadline was {{deposit_deadline}}.
    es: >-
      Según el Código Civil de California, sección 1950.5, …
computed:
  deposit_deadline:
    from: move_out_date
    deadline: deposit-return          # uses the period from deadlines.yaml
citations:
  - label: Cal. Civ. Code § 1950.5
    url: https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1950.5
```

How extending works:

- `params`, `computed` and `fields` are **merged**: yours are added, and one with
  the same name replaces the shared one.
- `title`, `summary`, `subject`, `body`, `closing`, `delivery_tips` and
  `checklist` **replace** the shared version if you include them.
- `citations` are **added** to the shared ones.

Shared letters declare empty text blocks (`law: null`) that states fill in.

**Fields** are the questions people answer. Every letter needs the `tenant`,
`landlord` and `sending` fieldsets (they provide the sender, recipient, date and
signature). Field types: `text`, `textarea`, `date`, `money`, `number`, `email`,
`tel`, `select` (with `options`), and `checkbox`. Useful settings:

```yaml
fields:
  - id: move_out_date          # lowercase_with_underscores
    type: date
    section: details           # you | landlord | details | sending (the wizard step)
    required: true
    label: { en: …, es: … }
    help: { en: …, es: … }     # shown under the question
    placeholder: { en: …, es: … }
    default: today             # dates only; or a select value; or true/false for checkboxes
    show_if: { field: itemization, equals: disputed }   # only ask when another answer matches
    max_length: 2000
```

**Computed dates** add a period to an answer (`from` a date field, or `today`),
or use a deadline from `deadlines.yaml`:

```yaml
computed:
  respond_by:
    from: letter_date
    add: { amount: 14, unit: calendar_days }
```

## Template language

`subject`, `body` and `params` use a small template language. It can only make
text, never run code.

| Write                                   | Result                                             |
| --------------------------------------- | -------------------------------------------------- |
| `{{tenant_name}}`                       | The answer, formatted (dates and money look right in each language) |
| `{{#if urgent}} … {{/if}}`              | Text shown only when `urgent` is checked or filled in |
| `{{#if urgent}} … {{else}} … {{/if}}`   | One text or the other                              |
| `{{#unless has_photos}} … {{/unless}}`  | Shown only when it's *not* checked or filled in    |
| `{{#if reason == "medical"}} … {{/if}}` | Compare a select answer (also `!=`)                |
| `{{! note to other volunteers }}`       | A comment, never shown                             |

Names you can use: field ids, `params`, `computed` dates, and `jurisdiction_name`.

Layout rules, so YAML stays readable:

- **A single line break is a space.** Wrap long sentences over several lines.
- **A blank line starts a new paragraph.**
- **A line with only `{{#if …}}`, `{{else}}` or `{{/if}}` disappears**, so
  optional paragraphs don't leave gaps.
- Line breaks **inside answers** (addresses, lists) are kept.

The sender block, date, recipient block, closing and signature are added
automatically. Start `body` with the first sentence of the letter.

## Holidays

Holiday calendars are rules, not lists of dates, so they never go out of date:

```yaml
- id: thanksgiving
  name: { en: Thanksgiving Day, es: Día de Acción de Gracias }
  date: { month: 11, weekday: thu, nth: 4 }          # nth: 1-5, or -1 for the last
- id: day-after-thanksgiving
  name: { en: Day after Thanksgiving, es: … }
  date: { month: 11, weekday: thu, nth: 4, offset_days: 1 }
- id: independence-day
  name: { en: Independence Day, es: … }
  date: { month: 7, day: 4, observed: nearest_weekday }  # Sat→Fri, Sun→Mon (default)
- id: juneteenth
  name: { en: Juneteenth, es: … }
  date: { month: 6, day: 19 }
  since: 2021                                         # first year it applies
```

`observed` can be `nearest_weekday` (default), `sunday_to_monday`, or `none`.
Check your state's court holiday list for a recent year against what the app
shows on the state page.

## Translations

Every piece of text is a map of language codes: `{ en: …, es: … }`. English is
required and is the fallback. The site's languages are listed in
`src/lib/i18n/config.ts`; the checker warns about missing translations, and CI
requires all of them. When a translation is missing, the app shows English and
says so.

In letter templates, use exactly the same `{{names}}` in every language. The
checker warns when a translation uses different ones.

Translating? Keep the meaning, not the word order, and keep the plain style.
Legal terms should match what courts in that state use in their own
translated forms, when they exist.

## Checking your work

```bash
npm install
npm run content:validate      # check every file (add --quiet for problems only)
npm run dev                   # see your changes at http://localhost:5173
```

The checker catches YAML mistakes, unknown names in templates, missing
translations, broken references between files, and ids that don't match file
names, and it gives the file and line of each problem.

Editors such as VS Code with the
[YAML extension](https://marketplace.visualstudio.com/items?itemName=redhat.vscode-yaml)
use the schemas in `schema/` to autocomplete and underline mistakes as you type.

## How to give credit

If you reuse or adapt these files, credit them like this (CC BY 4.0 requires it):

> Based on Tenantkit content (https://github.com/lobojoel2003/Tenantkit),
> licensed under CC BY 4.0. Changes were made.

Leave out "Changes were made" if you didn't change anything. Please don't
suggest that the Tenantkit project or its contributors endorse your version.
