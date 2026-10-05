/**
 * Citation helpers: formatted references, BibTeX export and Google Scholar
 * (Highwire Press) metadata. Pure functions with no Astro imports so they can
 * be unit-tested with Node directly (see tests/citation.test.ts).
 */

export const publicationTypes = [
  'journal-article',
  'conference-paper',
  'book-chapter',
  'preprint',
  'review',
  'other',
] as const;

export interface PublicationData {
  type: 'journal-article' | 'conference-paper' | 'book-chapter' | 'preprint' | 'review' | 'other';
  title: string;
  authors: string[];
  year: number;
  month?: number;
  day?: number;
  status?: string;
  journal?: string;
  bookTitle?: string;
  conference?: string;
  publisher?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  articleNumber?: string;
  doi?: string;
  url?: string;
  pdf?: string;
  abstract?: string;
  keywords?: string[];
  bibtexKey?: string;
}

export const TYPE_LABELS: Record<PublicationData['type'], string> = {
  'journal-article': 'Journal articles',
  'conference-paper': 'Conference papers',
  'book-chapter': 'Book chapters',
  preprint: 'Preprints',
  review: 'Reviews',
  other: 'Other publications',
};

export const TYPE_SINGULAR: Record<PublicationData['type'], string> = {
  'journal-article': 'Journal article',
  'conference-paper': 'Conference paper',
  'book-chapter': 'Book chapter',
  preprint: 'Preprint',
  review: 'Review',
  other: 'Publication',
};

/** The container a work appeared in (journal, book, proceedings). */
export function venue(p: PublicationData): string {
  return p.journal || p.bookTitle || p.conference || p.publisher || '';
}

/** "A. Author, B. Author and C. Author" */
export function authorList(authors: string[]): string {
  if (authors.length <= 1) return authors.join('');
  if (authors.length === 2) return `${authors[0]} and ${authors[1]}`;
  return `${authors.slice(0, -1).join(', ')} and ${authors[authors.length - 1]}`;
}

export function splitPages(pages?: string): { first?: string; last?: string } {
  if (!pages) return {};
  const [first, last] = pages.split(/\s*[-\u2013]\s*/);
  return { first, last };
}

/**
 * A neutral author-date reference string, e.g.
 * Author A, Author B (2024). Title. Journal 12(3), 45-67. https://doi.org/...
 */
export function formatCitation(p: PublicationData): string {
  const parts: string[] = [];
  parts.push(`${authorList(p.authors)} (${p.year}).`);
  parts.push(`${p.title.replace(/\.$/, '')}.`);
  const v = venue(p);
  if (v) {
    let where = v;
    if (p.volume) where += ` ${p.volume}`;
    if (p.issue) where += `(${p.issue})`;
    if (p.pages) where += `, ${p.pages.replace(/\s*-\s*/, '\u2013')}`;
    else if (p.articleNumber) where += `, ${p.articleNumber}`;
    parts.push(`${where}.`);
  }
  if (p.status && p.status !== 'published') parts.push(`(${p.status.replace('-', ' ')})`);
  if (p.doi) parts.push(`https://doi.org/${p.doi}`);
  else if (p.url) parts.push(p.url);
  return parts.join(' ');
}

const BIBTEX_TYPE: Record<PublicationData['type'], string> = {
  'journal-article': 'article',
  review: 'article',
  'conference-paper': 'inproceedings',
  'book-chapter': 'incollection',
  preprint: 'misc',
  other: 'misc',
};

function bibEscape(value: string): string {
  return value.replace(/([{}])/g, '\\$1').replace(/&/g, '\\&').replace(/%/g, '\\%');
}

/** Lowercase ASCII key such as "smith2024electronic". */
export function bibtexKey(p: PublicationData): string {
  if (p.bibtexKey) return p.bibtexKey;
  const surname = (p.authors[0] || 'anon').split(/[ ,]+/).filter(Boolean);
  const last = p.authors[0]?.includes(',') ? surname[0] : surname[surname.length - 1];
  const word = p.title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .find((w) => w.length > 3) || 'work';
  return `${(last || 'anon').toLowerCase().normalize('NFKD').replace(/[^a-z]/g, '')}${p.year}${word}`;
}

export function toBibtex(p: PublicationData): string {
  const type = BIBTEX_TYPE[p.type];
  const fields: [string, string | undefined][] = [
    ['author', p.authors.join(' and ')],
    ['title', p.title],
    [type === 'article' ? 'journal' : 'booktitle', p.journal || p.bookTitle || p.conference],
    ['publisher', p.publisher],
    ['year', String(p.year)],
    ['month', p.month ? String(p.month) : undefined],
    ['volume', p.volume],
    ['number', p.issue],
    ['pages', p.pages?.replace(/\s*[-\u2013]\s*/, '--')],
    ['doi', p.doi],
    ['url', p.url || (p.doi ? `https://doi.org/${p.doi}` : undefined)],
    ['note', p.status && p.status !== 'published' ? p.status.replace('-', ' ') : undefined],
  ];
  const body = fields
    .filter(([, v]) => v)
    // Titles get double braces so BibTeX styles keep their capitalisation.
    .map(([k, v]) => (k === 'title' ? `  title = {{${bibEscape(v as string)}}}` : `  ${k} = {${bibEscape(v as string)}}`))
    .join(',\n');
  return `@${type}{${bibtexKey(p)},\n${body}\n}`;
}

/**
 * Highwire Press tags read by Google Scholar. Only fields with genuine values
 * are emitted. `absolute` turns site paths into full URLs.
 */
export function scholarMeta(p: PublicationData, absolute: (path: string) => string): { name: string; content: string }[] {
  const tags: { name: string; content: string }[] = [];
  const add = (name: string, content?: string) => {
    if (content) tags.push({ name, content });
  };
  add('citation_title', p.title);
  for (const a of p.authors) add('citation_author', a);
  const date = [p.year, p.month, p.day].filter(Boolean).join('/');
  add('citation_publication_date', date);
  if (p.type === 'conference-paper') add('citation_conference_title', p.conference || p.bookTitle);
  else if (p.type === 'book-chapter') add('citation_inbook_title', p.bookTitle);
  else add('citation_journal_title', p.journal);
  add('citation_publisher', p.publisher);
  add('citation_volume', p.volume);
  add('citation_issue', p.issue);
  const { first, last } = splitPages(p.pages);
  add('citation_firstpage', first);
  add('citation_lastpage', last);
  add('citation_doi', p.doi);
  if (p.pdf) add('citation_pdf_url', p.pdf.startsWith('/') ? absolute(p.pdf) : p.pdf);
  if (p.keywords?.length) add('citation_keywords', p.keywords.join('; '));
  return tags;
}
