#!/usr/bin/env node
/**
 * Lists every [PLACEHOLDER] still present in the content files, plus missing
 * launch assets (CV, portrait). Run before launch: npm run audit:placeholders
 * Exits with code 1 when anything remains, so it can gate a CI job.
 */
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const PLACEHOLDER = /\[(?!\d+\])[^\[\]\n<>]{2,}\]/g;

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(p);
    else if (/\.(md|mdx)$/.test(entry.name) && !entry.name.startsWith('_')) yield p;
  }
}

let total = 0;
for await (const file of walk(join(ROOT, 'src/content'))) {
  const lines = (await readFile(file, 'utf8')).split('\n');
  const hits = [];
  lines.forEach((line, i) => {
    if (line.trim().startsWith('#')) return; // YAML comments
    const found = line.match(PLACEHOLDER);
    if (found) hits.push(`  line ${i + 1}: ${found.join(', ')}`);
  });
  if (hits.length) {
    total += hits.length;
    console.log(`\n${relative(ROOT, file)}`);
    console.log(hits.join('\n'));
  }
}

const profile = await readFile(join(ROOT, 'src/content/profile/profile.md'), 'utf8');
const cv = profile.match(/^cv:\s*"?([^"\n]+)"?/m)?.[1] ?? '/cv/academic-cv.pdf';
const checks = [
  [!cv.startsWith('/') || existsSync(join(ROOT, 'public', cv)), `CV file present at public${cv}`],
  [/^portrait:\s*\S/m.test(profile), 'Portrait set in src/content/profile/profile.md'],
  [!/confirmed:\s*false/.test(await readAll('src/content/teaching')), 'All teaching subjects confirmed (confirmed: true)'],
  [!/confirmed:\s*false/.test(await readAll('src/content/research')), 'All research themes confirmed (confirmed: true)'],
];

async function readAll(dir) {
  let out = '';
  for await (const f of walk(join(ROOT, dir))) out += await readFile(f, 'utf8');
  return out;
}

console.log('\nLaunch checks');
let failed = 0;
for (const [ok, message] of checks) {
  console.log(`  ${ok ? 'done' : 'TODO'}  ${message}`);
  if (!ok) failed++;
}
console.log(`\n${total} placeholder line(s) remaining, ${failed} launch check(s) outstanding.`);
console.log('Also set PUBLIC_ALLOW_INDEXING=true and PUBLIC_SHOW_EDITOR_NOTES=false for production.\n');
process.exit(total || failed ? 1 : 0);
