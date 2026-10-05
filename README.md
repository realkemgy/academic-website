# Academic Website

The personal academic, research and teaching website of **[FULL NAME], PhD**.

A static-first site built with Astro, TypeScript and Tailwind CSS. It is designed to be the academic's long-term professional home: fast, accessible, cheap to host, easy to edit, and movable between hosting providers without rebuilding anything.

> **Status: structure complete, content pending.** Every academic fact on the site is a clearly marked placeholder such as `[FULL NAME]` until genuine information is supplied. Run `npm run audit:placeholders` to see what remains.

---

## Contents

1. [Project overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Technology stack](#3-technology-stack)
4. [Project structure](#4-project-structure)
5. [Installation and local development](#5-installation-and-local-development)
6. [Production build](#6-production-build)
7. [Editing content](#7-editing-content)
8. [Environment variables](#8-environment-variables)
9. [Git workflow](#9-git-workflow)
10. [Deployment](#10-deployment)
11. [Custom domain, DNS and HTTPS](#11-custom-domain-dns-and-https)
12. [Contact form](#12-contact-form)
13. [SEO and academic discoverability](#13-seo-and-academic-discoverability)
14. [Accessibility](#14-accessibility)
15. [Security](#15-security)
16. [Analytics](#16-analytics)
17. [Launch checklist](#17-launch-checklist)
18. [Troubleshooting](#18-troubleshooting)
19. [Backup and recovery](#19-backup-and-recovery)
20. [Future CMS migration and extensions](#20-future-cms-migration-and-extensions)
21. [Ownership](#21-ownership)

Detailed guides live in [`docs/`](docs/):

| Guide | Covers |
| --- | --- |
| [docs/CONTENT-GUIDE.md](docs/CONTENT-GUIDE.md) | Every content file and field, with examples |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Step-by-step for Cloudflare, Azure Static Web Apps, Vercel and Netlify |
| [docs/DOMAINS-AND-DNS.md](docs/DOMAINS-AND-DNS.md) | A, AAAA, CNAME, TXT, apex and www, SSL, propagation |
| [docs/CONTACT-FORM.md](docs/CONTACT-FORM.md) | Backend architecture, providers, spam protection, rate limiting |

---

## 1. Project overview

The site is organised around the academic rather than a generic welcome page:

```
                     [NAME, PhD]
                          |
                  Academic identity
                          |
               -----------------------
               |                     |
           TEACHING              RESEARCH
               |                     |
        Subject areas          Research themes
               |                     |
      Learning resources       Publications
                                     |
                              Software / Projects
```

Pages: Home, Teaching (+ one page per subject), Research (+ one page per theme), Publications (+ one page per publication), Software & Projects (+ one page per project), About, Contact, Privacy and a 404 page.

**What makes it different from a template**

- Teaching and Research are the two visual pillars, side by side on the homepage.
- *Research at a Glance* is a figure, captioned like a journal figure, that maps how the fields connect. It has two layouts (wide and tall) so labels stay readable on phones, keyboard support, and a text-list alternative.
- Publications are set like a reference list, with DOI, PDF and Cite actions, BibTeX export, filters, and Google Scholar metadata on each publication's own page.
- Typography (Source Serif 4 with optical sizing, Source Sans 3) carries the design. Colour is restrained: paper, navy ink, a muted scientific blue for links, and an oxblood accent used sparingly.

**The no-fabrication rule.** The codebase contains no invented degrees, institutions, publications, awards, students, collaborators, course codes or software. Placeholders are bracketed, highlighted with a dashed yellow editor's mark, and excluded from structured data so search engines never receive them as facts. Empty sections are hidden rather than padded with examples.

---

## 2. Architecture

```
 Content (Markdown + YAML)          Presentation (Astro components)
 src/content/**  ───────────────►   src/components, src/layouts, src/pages
        │   validated by                         │
        ▼   src/content.config.ts                ▼
                    astro build  ──►  dist/  (plain HTML, CSS, fonts, images)
                                         │
                       any static host: Cloudflare, Azure SWA, Vercel, Netlify
                                         │
 Optional:  /api/contact  ─►  thin host adapter  ─►  server/contact/handler.js
                                                     (validation, spam checks,
                                                      email provider)
```

- **Static first.** Every page is pre-rendered to HTML at build time. There is no server to keep running and nothing to patch at runtime.
- **Minimal JavaScript.** Under 4 KB of script on any page (uncompressed, inlined, no framework runtime), all progressive enhancement: research-map highlighting, publication filters, copy buttons and contact-form validation. Every page is complete and usable with JavaScript disabled. The phone menu uses the browser's native Popover API and needs no script.
- **No React.** Nothing on the site needs a component framework at runtime. If a genuinely interactive feature is added later, `npx astro add react` enables React for that component only.
- **Content separate from presentation.** Academic content lives only in `src/content/`. Components never contain academic facts.
- **One contact-form core, many hosts.** The form handler is written once against the Web-standard `Request`/`Response` API. Each host gets a 10 to 30 line adapter. Changing host means switching adapters, not rewriting logic.

---

## 3. Technology stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | Astro 7 | Static output, content collections, built-in CSP hashing |
| Language | TypeScript (strict) | `npm run check` type-checks pages, components and server code |
| Styling | Tailwind CSS 4 | Utilities map onto design tokens in `src/styles/tokens.css` |
| Fonts | Source Serif 4, Source Sans 3 | Self-hosted via Fontsource. No third-party font requests |
| Images | `astro:assets` with sharp | Responsive AVIF and WebP for the portrait and figures |
| Sitemap | `@astrojs/sitemap` | Generated on every build |
| Tests | Node's built-in test runner | `npm test`, no extra dependencies |
| Node.js | 22.12 or newer | Required by Astro 7. Pinned in `.nvmrc` |
| Package manager | npm | Use npm consistently; the lockfile is `package-lock.json` |

Runtime dependencies: six. Dev dependencies: four.

---

## 4. Project structure

```
.
├── src/
│   ├── content/                  ← ALL academic content (edit these)
│   │   ├── profile/profile.md    name, title, institution, links, short bio
│   │   ├── snippets/             intro, research statement, teaching philosophy,
│   │   │                         collaboration text, contact preferences, privacy
│   │   ├── teaching/             one .md per subject (+ _TEMPLATE.md)
│   │   ├── research/             one .md per research theme (+ _TEMPLATE.md)
│   │   ├── publications/         one .md per publication (+ _TEMPLATE.md)
│   │   ├── projects/             one .md per software project (+ _TEMPLATE.md)
│   │   └── cv/                   About-page sections: education, appointments ...
│   ├── content.config.ts         schema for every content type (validation)
│   ├── data/
│   │   ├── navigation.ts         main navigation
│   │   └── research-map.ts       nodes and edges of "Research at a Glance"
│   ├── config/site.ts            non-content settings read from env variables
│   ├── components/               reusable UI (Header, Hero, ResearchNetwork ...)
│   ├── layouts/                  BaseLayout (document) and PageLayout (inner pages)
│   ├── pages/                    routes; [id].astro files generate detail pages
│   ├── styles/                   tokens.css (design tokens) and global.css
│   ├── utils/                    citation, placeholders, SEO, content helpers
│   └── assets/                   images processed by Astro (portrait goes here)
├── public/                       copied as-is to the site root
│   ├── cv/academic-cv.pdf        ← the CV (add this file)
│   ├── documents/                teaching materials and permitted PDFs
│   ├── images/og-default.png     social-sharing image (1200 x 630)
│   ├── _headers                  security headers (Cloudflare, Netlify)
│   └── staticwebapp.config.json  headers, 404 and API runtime (Azure)
├── server/contact/               platform-neutral contact form core
├── functions/api/contact.ts      Cloudflare Pages adapter
├── azure-functions/              Azure Functions adapter (bundled by a script)
├── netlify/functions/            Netlify adapter
├── api/contact.js                Vercel adapter
├── deploy/                       Azure workflow template, Cloudflare Workers config
├── scripts/                      placeholder audit, Azure API bundler
├── tests/                        unit tests for the form core and citations
├── docs/                         detailed guides
├── .github/                      CI workflow, Dependabot, PR template
├── astro.config.mjs  netlify.toml  vercel.json  .env.example  .nvmrc
```

---

## 5. Installation and local development

Requirements: **Node.js 22.12 or newer** (check with `node --version`) and Git.

```bash
git clone https://github.com/<owner>/<repository>.git
cd <repository>
npm install          # installs exact versions from package-lock.json (use npm ci in CI)
cp .env.example .env # optional for local work
npm run dev          # http://localhost:4321, reloads on save
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with live reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally, exactly as hosts will |
| `npm run check` | Type-check everything and validate content |
| `npm test` | Unit tests for the contact form and citation formatting |
| `npm run audit:placeholders` | List remaining placeholders and missing launch assets |
| `npm run build:azure-api` | Bundle the contact API for Azure into `.azure-api/` |

The Content Security Policy is only applied in `build` + `preview`, not in `dev` (an Astro limitation). Test security-sensitive changes with `npm run build && npm run preview`.

---

## 6. Production build

```bash
npm ci
npm run build
```

Output is plain static files in `dist/`. Build command `npm run build`, output directory `dist`, on every host.

During build you may see `The collection "publications" does not exist or is empty`. That is expected until the first publication is added; it is a warning, not an error.

---

## 7. Editing content

You never need to touch components to update the site. Everything below is a text file. Full field reference: [docs/CONTENT-GUIDE.md](docs/CONTENT-GUIDE.md).

**Placeholders.** Anything in square brackets is a placeholder: `[UNIVERSITY]`. Replace the whole thing, brackets included. The build validates every file, so a misspelt field name stops the build with a message naming the file and field.

**Templates.** Files whose names start with `_` (for example `_TEMPLATE.md`) are ignored by the site. Copy one, rename it in lowercase with hyphens, and fill it in. The file name becomes the web address: `src/content/research/excited-states.md` becomes `/research/excited-states/`.

### Biography, name, title and contact details
Edit `src/content/profile/profile.md`. The frontmatter (between the `---` lines) holds the name, title, roles, institution, department, office, email and profile links. The text below it is the short biography used on the homepage and About page. A link left as `""` is hidden everywhere.

### Teaching content
One file per subject in `src/content/teaching/`. Fields: `title`, `summary`, `order`, `featured`, `confirmed`, `levels`, `topics`, `objectives`, `courses`, `resources`, `readingList`, plus a Markdown description. Resource `type` is one of `lecture-notes`, `slides`, `assignment`, `tutorial`, `reading`, `link`, `external`, `download`. Put files in `public/documents/teaching/<subject>/` and link them as `/documents/teaching/<subject>/file.pdf`. The five starting subjects are marked `confirmed: false`, which shows a *Topics provisional* badge until you confirm them.

### Research topics
One file per theme in `src/content/research/`. Supports overview, research questions, topics, current projects, methods, computational techniques, significance, collaborators, students, datasets, outputs, links and related teaching. Sections without content are not shown. The three starting themes are provisional (`confirmed: false`); rename, remove or replace them freely. Update `src/data/research-map.ts` if you change themes so the figure stays accurate.

### Publications
One file per publication in `src/content/publications/`, copied from `_TEMPLATE.md`. Required: `type`, `title`, `authors`, `year`. Optional: `month`, `journal`/`bookTitle`/`conference`, `volume`, `issue`, `pages`, `doi` (without `https://doi.org/`), `url`, `pdf`, `abstract`, `keywords`, `research`, `selected`, `status`. `selected: true` puts it in *Selected Publications* on the homepage. Each publication gets its own page with Google Scholar tags. The field names follow Crossref/CSL/BibTeX conventions so records can later be imported automatically (see section 20).

### Software projects
One file per project in `src/content/projects/`. Fields for the scientific problem, research context, significance, methods, languages, technologies, status, licence, repository, documentation, demo, website and linked publication. `featured: true` shows it on the homepage. List only technologies that are confirmed.

### Replacing the CV
Save the PDF as `public/cv/academic-cv.pdf`. That is all. Download CV buttons appear on the homepage, About page and footer as soon as the file exists, and show a disabled placeholder until then. To use another file name, change `cv:` in `profile.md`. Optionally set `cvUpdated: "September 2026"` to show the date beside the button.

### Updating the portrait
Put a high-resolution image (JPEG or PNG, at least 1000 px tall, 4:5 crop works best) in `src/assets/`, for example `src/assets/portrait.jpg`, then in `profile.md` set:

```yaml
portrait: ../../assets/portrait.jpg
portraitAlt: "Portrait of Dr Jane Doe"
```

Astro generates responsive AVIF and WebP versions automatically.

### Updating contact information and social links
All in `profile.md` under `email`, `office`, `department`, `institution` and `links` (`orcid`, `googleScholar`, `researchGate`, `linkedin`, `github`, `institutionalProfile`, `other`). Only links with real URLs are shown.

### Short passages
`src/content/snippets/`: `home-intro.md` (homepage introduction, 100 to 150 words), `research-statement.md`, `teaching-philosophy.md`, `collaboration.md`, `contact-preferences.md`, `privacy.md`.

### About-page sections
`src/content/cv/`: education, academic appointments, professional experience, awards and honours, research grants, memberships, academic service, conference activity, invited talks, supervision and professional activities. Each section is hidden until it has at least one entry.

### Design changes
Colours, fonts, type scale, spacing, widths, radii, shadows and motion timings are tokens in `src/styles/tokens.css`. Component classes (buttons, labels, tags, prose, form controls) are in `src/styles/global.css`.

---

## 8. Environment variables

Documented line by line in [`.env.example`](.env.example). Summary:

| Variable | Scope | Purpose |
| --- | --- | --- |
| `PUBLIC_SITE_URL` | build, public | Canonical origin (apex or www). Drives canonical URLs, sitemap, Open Graph |
| `PUBLIC_SITE_LANG` | build, public | Content language, default `en-GB` |
| `PUBLIC_ALLOW_INDEXING` | build, public | `true` only for production after launch. Otherwise pages are `noindex` and robots.txt disallows all |
| `PUBLIC_SHOW_EDITOR_NOTES` | build, public | `false` at launch to hide the yellow editor notes |
| `PUBLIC_CONTACT_FORM_ENABLED` | build, public | `true` once a backend is configured |
| `PUBLIC_CONTACT_ENDPOINT` | build, public | Form handler URL, default `/api/contact` |
| `PUBLIC_TURNSTILE_SITE_KEY` | build, public | Optional Cloudflare Turnstile widget |
| `CONTACT_TO_EMAIL`, `CONTACT_FROM_EMAIL` | server | Delivery addresses |
| `EMAIL_PROVIDER` | server | `resend`, `graph` or `webhook` |
| `RESEND_API_KEY` / `GRAPH_*` / `CONTACT_WEBHOOK_*` | server, secret | Provider credentials |
| `TURNSTILE_SECRET_KEY` | server, secret | Turnstile verification |
| `CONTACT_RATE_LIMIT`, `CONTACT_RATE_WINDOW_SECONDS`, `CONTACT_MAX_LINKS`, `CONTACT_ALLOWED_ORIGINS` | server | Spam and abuse limits |
| `PUBLIC_ANALYTICS_*` | build, public | Off unless a provider is named (section 16) |

**Rules.** `PUBLIC_*` values are compiled into the HTML and are visible to anyone: never put a secret in one. Secrets go only in the hosting dashboard (or `.env` locally, which is git-ignored). Never put real keys in source files, the repository, client-side JavaScript or this README.

Because the site is static, changing a `PUBLIC_*` variable requires a new build (redeploy) to take effect. Server variables take effect on the next function invocation.

---

## 9. Git workflow

```
local edit ─► feature branch ─► pull request ─► preview deployment ─► review ─► merge to main ─► production
```

- `main` is production. Only merges to `main` change the live site.
- Every change happens on a branch: `git switch -c content/add-2026-papers`.
- Open a pull request on GitHub. The **CI** workflow (`.github/workflows/ci.yml`) type-checks, validates content, runs tests and builds. The hosting provider posts a **preview URL** on the pull request.
- Review the preview, then merge. The host deploys `main` automatically.
- Protect `main` in GitHub (Settings > Branches > add rule): require a pull request and require the `CI / build` check to pass.

Content-only edits can also be made in GitHub's web editor ("Edit this file", then "Create a new branch and start a pull request"). No local setup is needed for that.

---

## 10. Deployment

Full step-by-step instructions for each host: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

| | Cloudflare Pages | Azure Static Web Apps | Vercel | Netlify |
| --- | --- | --- | --- | --- |
| Build command | `npm run build` | in GitHub Actions | `npm run build` | `npm run build` |
| Output | `dist` | `dist` (prebuilt) | `dist` | `dist` |
| Node version | `.nvmrc` (22) | `.nvmrc` via setup-node | `engines` in package.json | `netlify.toml` |
| PR previews | yes | yes (workflow) | yes | yes |
| Headers file | `public/_headers` | `public/staticwebapp.config.json` | `vercel.json` | `public/_headers` |
| Contact adapter | `functions/api/contact.ts` | `azure-functions/` | `api/contact.js` | `netlify/functions/contact.mjs` |
| Free plan | yes | yes (Free plan) | Hobby plan is for personal, non-commercial use | yes |

**Recommendation.** Cloudflare (Pages, or Workers with static assets) for the lowest cost and simplest operation. Azure Static Web Apps if the institution or owner standardises on Azure. All four are supported equally by the code. Azure App Service is not needed: this is a static site and App Service would add cost and maintenance for no benefit. It remains an option if server-side requirements grow substantially.

**A note on Cloudflare Pages.** Cloudflare continues to support Pages, but its newer features are being built for Workers, and it publishes a Pages-to-Workers migration guide. This repository supports both: Pages works with zero configuration, and `deploy/cloudflare-workers/` contains a ready Workers setup. For a new project, Workers with static assets is the more future-proof Cloudflare option. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#1b-cloudflare-workers-alternative).

---

## 11. Custom domain, DNS and HTTPS

Full guide with record types and examples: **[docs/DOMAINS-AND-DNS.md](docs/DOMAINS-AND-DNS.md)**.

1. Decide the canonical hostname: `example.com` or `www.example.com`. Set `PUBLIC_SITE_URL` to it.
2. Add **both** hostnames to the hosting project before changing DNS.
3. At the DNS provider (which may not be the registrar), create the records the host shows: usually a CNAME for `www`, and an ALIAS/ANAME/flattened CNAME or A record for the apex. Some hosts also ask for a TXT record to prove ownership.
4. Configure the host to redirect the non-canonical hostname to the canonical one with a 301.
5. HTTPS certificates are issued automatically once DNS resolves. Vercel, Netlify and Azure redirect HTTP to HTTPS on their own; on Cloudflare, turn on Always Use HTTPS for the zone.
6. Allow time for propagation (minutes to 48 hours; Azure documents up to 72 hours for apex domains).

Always copy the exact values from your host's domain screen. They differ per account and change over time.

---

## 12. Contact form

Architecture, provider setup and security details: **[docs/CONTACT-FORM.md](docs/CONTACT-FORM.md)**.

```
Visitor ─► form (client-side validation) ─► /api/contact ─► host adapter
        ─► server/contact/handler.js: origin check, size limit, honeypot,
           timing check, server-side validation, rate limit, optional
           Turnstile, link limit ─► email provider ─► academic inbox
```

- **Off by default.** Until `PUBLIC_CONTACT_FORM_ENABLED=true`, the form validates but shows that sending is not active, and points to email.
- **Works without JavaScript.** A plain form POST is accepted and redirected to `/contact/thanks/` or `/contact/not-sent/`.
- **Providers.** Resend, Microsoft Graph (`sendMail` with an Entra ID app scoped to one mailbox), or a generic webhook (Power Automate, Logic Apps, n8n, Zapier). All use `fetch` only; no SDKs.
- **Secrets stay on the server.** The browser only ever sees the public Turnstile site key.
- **Tested.** `npm test` covers validation, honeypot, timing, origin, rate limit, Turnstile, link limit, payload size, provider failure and the Graph flow.

The rate limiter is in memory, so on serverless platforms it limits bursts per warm instance only. For a strict limit, add an edge rule at the host (documented per host in the contact guide).

---

## 13. SEO and academic discoverability

- Unique title, meta description and canonical URL on every page. Open Graph and Twitter card metadata with a default 1200 x 630 image (`public/images/og-default.png`, replace freely).
- `sitemap-index.xml` on every build; `robots.txt` generated at build time.
- JSON-LD: `WebSite` and `Person` on the homepage, `BreadcrumbList` on inner pages, `ScholarlyArticle` on publication pages. **Person and WebSite are omitted while the name is a placeholder**, and placeholder values never enter structured data.
- Google Scholar (Highwire Press) tags on each publication page: `citation_title`, one `citation_author` per author, `citation_publication_date`, `citation_journal_title`, `citation_volume`, `citation_issue`, `citation_firstpage`, `citation_lastpage`, `citation_doi`, `citation_pdf_url`. Google Scholar's inclusion guidelines ask for one paper per page with the full abstract or full text visible, which is why each publication has its own page. Only include a PDF where the publisher's licence permits self-archiving.
- **Indexing is off until you turn it on** (`PUBLIC_ALLOW_INDEXING=true`), so a half-finished site is never indexed. Keep it `false` for preview environments.

---

## 14. Accessibility

Target: WCAG 2.2 AA.

- Semantic landmarks, one `h1` per page, ordered headings, skip link, visible focus on every interactive element.
- Colour pairs checked: body text 13.7:1, muted text 6.1:1, links 7.7:1, accent 8.8:1 on the light background; the dark theme was checked to similar margins. Form-control borders meet the 3:1 non-text contrast requirement.
- Light and dark themes follow the visitor's system preference.
- Forms: visible labels, required fields marked in text, inline error messages linked with `aria-describedby`, `aria-invalid`, focus moved to the first error, status announced through a live region.
- Touch targets of at least 44 px for buttons, navigation and form controls.
- `prefers-reduced-motion` disables transitions and smooth scrolling.
- The research map has an accessible name, keyboard-focusable nodes and a full text alternative.
- Decorative graphics are hidden from assistive technology; the portrait requires `portraitAlt`.

Automated checks cannot prove conformance. Before launch, test with a screen reader (NVDA or VoiceOver) and keyboard only, and run Lighthouse or axe on the preview.

---

## 15. Security

- HTTPS everywhere, with HSTS (`max-age=31536000`, without `includeSubDomains` so other subdomains are not affected; add it only if every subdomain serves HTTPS).
- Content Security Policy: Astro hashes every script and style and writes the policy into each page; host headers add `frame-ancestors 'none'`, `object-src 'none'` and `base-uri 'self'`. No inline scripts or styles are allowed except those Astro has hashed.
- Other headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`.
- No third-party scripts, fonts or trackers by default.
- Contact form: server-side validation, origin check, body size limit, header-injection protection, honeypot, timing trap, rate limiting, optional Turnstile, and no logging of message contents.
- Dependabot opens monthly update pull requests; CI must pass before merging.
- No secrets in the repository. `.env` is git-ignored.

---

## 16. Analytics

**No analytics are installed.** The hook in `src/components/Analytics.astro` renders nothing unless `PUBLIC_ANALYTICS_PROVIDER` is set to `plausible`, `umami` or `cloudflare` with the matching `PUBLIC_ANALYTICS_*` values. Enabling one is the owner's decision. If you do:

1. Add the provider's script host to `script-src` and `connect-src` in `astro.config.mjs`.
2. Update `src/content/snippets/privacy.md` to name the provider and what it collects.
3. Prefer cookieless options (Plausible, Umami, Cloudflare Web Analytics) to avoid consent banners. Google Analytics generally sets cookies and would need a consent mechanism in many jurisdictions.

---

## 17. Launch checklist

```bash
npm run audit:placeholders   # must report 0 placeholders and 0 outstanding checks
```

- [ ] All placeholders replaced with genuine information
- [ ] Teaching subjects and research themes confirmed (`confirmed: true`) or removed
- [ ] `src/data/research-map.ts` reviewed
- [ ] Portrait and CV added
- [ ] Privacy notice reviewed
- [ ] Production variables: `PUBLIC_SITE_URL`, `PUBLIC_ALLOW_INDEXING=true`, `PUBLIC_SHOW_EDITOR_NOTES=false`
- [ ] Contact form tested end to end on the live domain, or left disabled
- [ ] Custom domain, HTTPS and www/apex redirect verified
- [ ] Google Search Console and Bing Webmaster Tools: verify the domain and submit `sitemap-index.xml`
- [ ] Keyboard and screen-reader pass; Lighthouse run on the live site

---

## 18. Troubleshooting

| Symptom | Likely cause and fix |
| --- | --- |
| Build fails with a content error | The message names the file and field. Check spelling, indentation and quotes in the YAML frontmatter. Text containing `:` or starting with `[` must be in quotes |
| `collection ... is empty` warning | Normal until the first publication or project is added |
| Build fails on the host but works locally | Node version. The host must use Node 22.12+ (see `.nvmrc` and the host table above) |
| Page shows old content after merge | Check the deployment log in the host dashboard; hard-refresh the browser |
| Changed a `PUBLIC_*` variable, nothing happened | Static values are baked in at build time. Trigger a redeploy |
| Download CV is greyed out | `public/cv/academic-cv.pdf` is missing, or `cv:` in `profile.md` points elsewhere |
| Contact form says it is not active | Set `PUBLIC_CONTACT_FORM_ENABLED=true` and redeploy, after configuring the provider |
| Contact form returns 503 | `EMAIL_PROVIDER` or `CONTACT_TO_EMAIL` not set for the function |
| Contact form returns 502 | Provider rejected the request: check the API key, sender domain verification, or Graph permissions. The function log records the provider's status code |
| Contact form returns 403 | The request came from an origin not equal to the site. Add the alias to `CONTACT_ALLOWED_ORIGINS` |
| Custom domain shows a certificate error | DNS has not propagated, or a CAA record blocks the host's certificate authority |
| Site not appearing in Google | `PUBLIC_ALLOW_INDEXING` is not `true` in production, or the site is new. Submit the sitemap in Search Console |
| A script or style is blocked in the console | A change introduced an inline script or third-party host. Add it to the CSP in `astro.config.mjs` |

---

## 19. Backup and recovery

GitHub is the authoritative copy of the website: code, content, images, CV and publication metadata are all version-controlled. The build output and the hosting provider are disposable.

**If the hosting provider disappears**

1. `git clone` the repository
2. `npm ci`
3. `npm run build`
4. Deploy `dist/` to any static host (docs/DEPLOYMENT.md), or simply upload the folder
5. Point DNS at the new host (docs/DOMAINS-AND-DNS.md) and set the environment variables again from `.env.example`

**Additional safeguards**

- Keep a second copy of the repository: a local clone on another machine, or a scheduled mirror to another Git host.
- Record outside the repository (in a password manager): registrar login, DNS provider login, hosting accounts, email provider keys, and the values of every server-side environment variable. Secrets are deliberately not in Git, so they must be recoverable elsewhere.
- Large original files (high-resolution photographs, raw data) that you do not want in Git should be backed up separately.
- To undo a bad change: revert the commit on GitHub (or `git revert <commit>`) and merge; every host also allows rolling back to a previous deployment from its dashboard.

---

## 20. Future CMS migration and extensions

The content model is already the shape most Git-based CMSs expect: Markdown files with YAML frontmatter in predictable folders, validated by a schema. That means a CMS can be added later without redesigning the site:

- **Git-based CMS** (for example Decap CMS, TinaCMS, Keystatic): point it at `src/content/**` and mirror the fields in `src/content.config.ts`. Edits become commits and pull requests, so the Git workflow above is unchanged.
- **Headless CMS** (for example Sanity, Contentful, Strapi): write an Astro content loader for the collection and keep the same schema. Components do not change.

**Architecture already allows** (none of these are built yet): news, a research blog, events and seminars, group members and supervision pages (new collections plus pages), datasets, conference presentations, ORCID or Crossref import (a build-time loader that writes publication entries), BibTeX export of the full list (an endpoint like `robots.txt.ts`), site search (Pagefind runs on static output with no server), and Google Scholar links.

---

## 21. Ownership

The academic or a designated owner should hold, in their own name: the GitHub repository, the domain registration, the DNS account, the hosting account(s), the email provider account and any analytics account. No part of this site depends on the developer, on any AI tool used to build it, or on a proprietary hosting API. The licence for the code is the owner's choice; add a `LICENSE` file if the source will be public.
