# Content guide

Everything on the site that describes the academic lives in `src/content/`. Each file is Markdown with a block of settings at the top (frontmatter) between two `---` lines:

```markdown
---
title: Quantum Chemistry
order: 2
topics:
  - Wavefunctions
  - Operators
---

Normal text written in Markdown goes here.
```

## Rules of thumb

- **Placeholders** are text in square brackets, such as `[UNIVERSITY]`. Replace the whole thing, brackets included. `npm run audit:placeholders` lists those left.
- **Quote text** that contains a colon or starts with a bracket: `summary: "Methods: theory and computation"`.
- **Lists** are written with a dash on each line (or `[a, b, c]` on one line). An empty list is `[]`.
- **Empty means hidden.** A field left empty or `[]` makes its section disappear. There is no need to delete headings.
- **File names** become web addresses. Use lowercase and hyphens: `excited-states.md` → `/research/excited-states/`. Renaming a file changes its address.
- **Templates** start with `_` and are ignored. Copy `_TEMPLATE.md`, rename, edit.
- **Validation.** `npm run build` (or the CI check on a pull request) fails with the file name and field if something is wrong. Nothing broken reaches production.
- **Never invent.** Only genuine information belongs in these files. If something is uncertain, leave it as a placeholder or mark the entry `confirmed: false`.

## Files and fields

### `profile/profile.md`
| Field | Meaning |
| --- | --- |
| `name` | Full professional name |
| `preferredName` | Optional shorter name for the header and title |
| `postNominals` | Shown after the name, e.g. `PhD` |
| `title` | Exact academic title |
| `roles` | Short descriptors under the name in the hero |
| `positioning` | One-sentence statement in the hero and default page description |
| `institution`, `department`, `office`, `email` | Contact details |
| `portrait`, `portraitAlt` | Image in `src/assets/` and its alternative text |
| `cv`, `cvUpdated` | Path of the CV PDF in `public/`, optional date label |
| `links.orcid`, `links.googleScholar`, `links.researchGate`, `links.linkedin`, `links.github`, `links.institutionalProfile` | Full `https://` URLs; empty hides them |
| `links.other` | Extra links: `- { label: "Blog", url: "https://..." }` |
| body | Short biography (homepage and About page) |

### `snippets/*.md`
Body text only. `home-intro` (100 to 150 words), `research-statement`, `teaching-philosophy`, `collaboration`, `contact-preferences`, `privacy`.

### `teaching/*.md`
| Field | Meaning |
| --- | --- |
| `title`, `summary` | Name and one-sentence description |
| `order` | Position in lists (lower first) |
| `featured` | Show on the homepage |
| `confirmed` | `false` shows a "Topics provisional" badge |
| `levels` | e.g. `[Undergraduate, Postgraduate]` |
| `topics`, `objectives` | Lists |
| `courses` | `title`, `level`, `term`, `description`, `url`. Do not invent course codes |
| `resources` | `title`, `type`, `url`, `description`, `date`, `format`. `type`: `lecture-notes`, `slides`, `assignment`, `tutorial`, `reading`, `link`, `external`, `download` |
| `readingList` | `citation`, `url` |
| body | Subject and course description |

### `research/*.md`
`title`, `summary`, `order`, `featured`, `confirmed`, `topics`, `questions`, `methods`, `techniques`, `significance`, `currentProjects` (`title`, `description`, `status`, `url`), `collaborators` (`name`, `affiliation`, `url`), `students` (`name`, `role`, `url`), `datasets` (`title`, `description`, `url`), `outputs` (`title`, `description`, `url`), `links` (`label`, `url`), `relatedTeaching` (teaching file names). Body: research overview.

Publications and projects are linked to a theme from their own files (`research: [theme-file-name]`), so a theme page lists them automatically.

### `publications/*.md`
| Field | Required | Notes |
| --- | --- | --- |
| `type` | yes | `journal-article`, `conference-paper`, `book-chapter`, `preprint`, `review`, `other` |
| `title`, `authors`, `year` | yes | Authors in published order |
| `month`, `day` | no | Numbers |
| `status` | no | `published` (default), `in-press`, `accepted`, `submitted`, `preprint` |
| `journal` / `bookTitle` / `conference`, `publisher` | no | Where it appeared |
| `volume`, `issue`, `pages` or `articleNumber` | no | Text, e.g. `"45-67"` |
| `doi` | no | `10.xxxx/...` without `https://doi.org/` |
| `url`, `pdf` | no | Publisher page; PDF in `public/documents/publications/` only where the licence allows |
| `abstract`, `keywords` | no | The abstract is shown on the publication's page (Google Scholar needs it visible) |
| `research` | no | Research theme file names |
| `selected` | no | Show on the homepage |
| `bibtexKey`, `note`, `draft` | no | `draft: true` hides the entry |

### `projects/*.md`
`title`, `summary`, `problem`, `context`, `significance`, `methods`, `technologies`, `languages`, `status` (`planned`, `in-development`, `active`, `maintained`, `completed`, `archived`), `license`, `repo`, `docs`, `demo`, `website`, `publication` (a publication file name or a URL), `research`, `featured`, `order`, `draft`. Body: longer description.

### `cv/*.md`
One file per About-page section. `title`, `order`, and `items`, each with `heading`, `place`, `start`, `end`, `detail`, `description`, `url`. A section with no items and no body text is hidden.

## Other editable data

| File | Contains |
| --- | --- |
| `src/data/research-map.ts` | Fields, links and coordinates in *Research at a Glance* (two layouts: `wide` for desktop, `tall` for phones) |
| `src/data/navigation.ts` | Main navigation order and labels |
| `src/styles/tokens.css` | Colours, fonts, type scale, spacing, widths |
| `public/images/og-default.png` | Image shown when the site is shared on social media (1200 x 630) |
| `public/cv/academic-cv.pdf` | The CV |

## Importing publications later

The publication fields mirror Crossref, CSL-JSON and BibTeX. A future build-time loader (or a one-off script) can convert a BibTeX file or an ORCID works list into one Markdown file per publication with the same fields, so no page or component would need to change.
