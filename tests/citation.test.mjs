import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCitation, toBibtex, scholarMeta, bibtexKey } from '../src/utils/citation.ts';
import { isPlaceholder, markPlaceholders, markPlaceholdersInHtml } from '../src/utils/placeholders.ts';

// A synthetic record used only to exercise the formatter. Not a real paper.
const sample = {
  type: 'journal-article',
  title: 'A test title for formatter checks',
  authors: ['A. Example', 'B. Sample', 'C. Placeholder'],
  year: 2026,
  month: 3,
  journal: 'Journal of Test Data',
  volume: '12',
  issue: '3',
  pages: '45-67',
  doi: '10.0000/test.0001',
  keywords: ['testing'],
};

test('formats an author-date reference', () => {
  assert.equal(
    formatCitation(sample),
    'A. Example, B. Sample and C. Placeholder (2026). A test title for formatter checks. Journal of Test Data 12(3), 45–67. https://doi.org/10.0000/test.0001',
  );
});

test('produces BibTeX with escaped braces and double-braced title', () => {
  const bib = toBibtex({ ...sample, title: 'Use of {braces} & 50% tests' });
  assert.match(bib, /^@article\{example2026braces,/);
  assert.match(bib, /title = \{\{Use of \\\{braces\\\} \\& 50\\% tests\}\}/);
  assert.match(bib, /pages = \{45--67\}/);
});

test('bibtex key handles "Surname, Given" authors', () => {
  assert.equal(bibtexKey({ ...sample, authors: ['Doe, Jane'] }), 'doe2026test');
});

test('scholar meta has one citation_author per author and absolute PDF URL', () => {
  const tags = scholarMeta({ ...sample, pdf: '/documents/publications/x.pdf' }, (p) => `https://example.com${p}`);
  assert.equal(tags.filter((t) => t.name === 'citation_author').length, 3);
  assert.deepEqual(tags.find((t) => t.name === 'citation_publication_date'), { name: 'citation_publication_date', content: '2026/3' });
  assert.equal(tags.find((t) => t.name === 'citation_firstpage').content, '45');
  assert.equal(tags.find((t) => t.name === 'citation_pdf_url').content, 'https://example.com/documents/publications/x.pdf');
});

test('placeholder detection', () => {
  assert.equal(isPlaceholder('[FULL NAME]'), true);
  assert.equal(isPlaceholder('Dr Jane Doe'), false);
  assert.equal(isPlaceholder(''), true);
  assert.equal(isPlaceholder('See reference [1]'), false);
});

test('placeholder marking escapes HTML and leaves attributes alone', () => {
  assert.match(markPlaceholders('<b>[NAME]</b>'), /^&lt;b&gt;<mark class="ph"[^>]*>\[NAME\]<\/mark>&lt;\/b&gt;$/);
  const html = markPlaceholdersInHtml('<p><a href="/x" title="[KEEP]">[TEXT]</a></p>');
  assert.match(html, /title="\[KEEP\]"/);
  assert.match(html, /<mark class="ph"[^>]*>\[TEXT\]<\/mark>/);
});
