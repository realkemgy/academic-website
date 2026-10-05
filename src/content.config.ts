/**
 * Content model.
 *
 * Every piece of academic content lives in src/content/ as Markdown (with YAML
 * frontmatter) and is validated here at build time. A typo in a field name or
 * a missing required value fails the build with a readable message instead of
 * silently breaking a page.
 *
 * Files whose names start with an underscore (for example _TEMPLATE.md) are
 * ignored, so templates can sit next to real entries.
 */
import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { publicationTypes } from './utils/citation';

const md = (base: string) => glob({ base, pattern: '**/[^_]*.md' });

/** A URL, a site-relative path ("/documents/x.pdf") or an empty string. */
const href = z
  .string()
  .trim()
  .refine((v) => v === '' || v.startsWith('/') || /^https?:\/\//.test(v) || v.startsWith('mailto:'), {
    error: 'Use a full https:// URL, a site path starting with "/", or leave it empty.',
  })
  .default('');

const link = z.object({ label: z.string(), url: href });

// ---------------------------------------------------------------------------
// Profile: a single file holding identity, contact details and the short bio.
// ---------------------------------------------------------------------------
const profile = defineCollection({
  loader: md('./src/content/profile'),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      preferredName: z.string().default(''),
      postNominals: z.string().default(''),
      title: z.string(),
      roles: z.array(z.string()).default([]),
      positioning: z.string().default(''),
      institution: z.string().default(''),
      department: z.string().default(''),
      office: z.string().default(''),
      email: z.string().default(''),
      portrait: image().optional(),
      portraitAlt: z.string().default(''),
      cv: z.string().default('/cv/academic-cv.pdf'),
      cvUpdated: z.string().default(''),
      links: z
        .object({
          orcid: href,
          googleScholar: href,
          researchGate: href,
          linkedin: href,
          github: href,
          institutionalProfile: href,
          other: z.array(link).default([]),
        })
        .prefault({}),
    }),
});

// ---------------------------------------------------------------------------
// Snippets: short editable passages (intro, statements, privacy notice).
// ---------------------------------------------------------------------------
const snippets = defineCollection({
  loader: md('./src/content/snippets'),
  schema: z.object({
    title: z.string(),
    note: z.string().optional(),
  }),
});

// ---------------------------------------------------------------------------
// Teaching subjects
// ---------------------------------------------------------------------------
const resourceTypes = [
  'lecture-notes',
  'slides',
  'assignment',
  'tutorial',
  'reading',
  'link',
  'external',
  'download',
] as const;

const teaching = defineCollection({
  loader: md('./src/content/teaching'),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number().default(100),
    featured: z.boolean().default(true),
    /** false = topics are illustrative and awaiting confirmation. */
    confirmed: z.boolean().default(false),
    levels: z.array(z.string()).default([]),
    topics: z.array(z.string()).default([]),
    objectives: z.array(z.string()).default([]),
    courses: z
      .array(
        z.object({
          title: z.string(),
          level: z.string().optional(),
          term: z.string().optional(),
          description: z.string().optional(),
          url: href,
        }),
      )
      .default([]),
    resources: z
      .array(
        z.object({
          title: z.string(),
          type: z.enum(resourceTypes),
          url: href,
          description: z.string().optional(),
          date: z.string().optional(),
          format: z.string().optional(),
        }),
      )
      .default([]),
    readingList: z.array(z.object({ citation: z.string(), url: href })).default([]),
  }),
});

// ---------------------------------------------------------------------------
// Research themes
// ---------------------------------------------------------------------------
const research = defineCollection({
  loader: md('./src/content/research'),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    order: z.number().default(100),
    featured: z.boolean().default(true),
    confirmed: z.boolean().default(false),
    topics: z.array(z.string()).default([]),
    questions: z.array(z.string()).default([]),
    methods: z.array(z.string()).default([]),
    techniques: z.array(z.string()).default([]),
    significance: z.string().default(''),
    currentProjects: z
      .array(z.object({ title: z.string(), description: z.string().optional(), status: z.string().optional(), url: href }))
      .default([]),
    collaborators: z
      .array(z.object({ name: z.string(), affiliation: z.string().optional(), url: href }))
      .default([]),
    students: z.array(z.object({ name: z.string(), role: z.string().optional(), url: href })).default([]),
    datasets: z.array(z.object({ title: z.string(), description: z.string().optional(), url: href })).default([]),
    outputs: z.array(z.object({ title: z.string(), description: z.string().optional(), url: href })).default([]),
    links: z.array(link).default([]),
    relatedTeaching: z.array(reference('teaching')).default([]),
  }),
});

// ---------------------------------------------------------------------------
// Publications. Fields follow common bibliographic metadata (Crossref / CSL /
// BibTeX) so records can later be imported from DOI, ORCID or BibTeX.
// ---------------------------------------------------------------------------

const publications = defineCollection({
  loader: md('./src/content/publications'),
  schema: z.object({
    type: z.enum(publicationTypes),
    title: z.string(),
    authors: z.array(z.string()).min(1),
    year: z.number().int().min(1900).max(2100),
    month: z.number().int().min(1).max(12).optional(),
    day: z.number().int().min(1).max(31).optional(),
    status: z.enum(['published', 'in-press', 'accepted', 'submitted', 'preprint']).default('published'),
    journal: z.string().optional(),
    bookTitle: z.string().optional(),
    conference: z.string().optional(),
    publisher: z.string().optional(),
    volume: z.string().optional(),
    issue: z.string().optional(),
    pages: z.string().optional(),
    articleNumber: z.string().optional(),
    doi: z
      .string()
      .transform((v) => v.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, ''))
      .optional(),
    url: href,
    pdf: href,
    abstract: z.string().optional(),
    keywords: z.array(z.string()).default([]),
    research: z.array(reference('research')).default([]),
    selected: z.boolean().default(false),
    bibtexKey: z.string().optional(),
    note: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

// ---------------------------------------------------------------------------
// Software and projects
// ---------------------------------------------------------------------------
const projects = defineCollection({
  loader: md('./src/content/projects'),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    problem: z.string().default(''),
    context: z.string().default(''),
    significance: z.string().default(''),
    methods: z.array(z.string()).default([]),
    technologies: z.array(z.string()).default([]),
    languages: z.array(z.string()).default([]),
    status: z.enum(['planned', 'in-development', 'active', 'maintained', 'completed', 'archived']),
    license: z.string().default(''),
    repo: href,
    docs: href,
    demo: href,
    website: href,
    publication: z.union([reference('publications'), z.string()]).optional(),
    research: z.array(reference('research')).default([]),
    featured: z.boolean().default(false),
    order: z.number().default(100),
    draft: z.boolean().default(false),
  }),
});

// ---------------------------------------------------------------------------
// CV sections shown on the About page (education, appointments, awards ...)
// ---------------------------------------------------------------------------
const cv = defineCollection({
  loader: md('./src/content/cv'),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    items: z
      .array(
        z.object({
          heading: z.string(),
          detail: z.string().optional(),
          place: z.string().optional(),
          start: z.string().optional(),
          end: z.string().optional(),
          description: z.string().optional(),
          url: href,
        }),
      )
      .default([]),
  }),
});

export const collections = { profile, snippets, teaching, research, publications, projects, cv };
