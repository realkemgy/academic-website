/**
 * Typed helpers for reading content collections in a consistent order.
 */
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { isReal } from './placeholders';

export type Profile = CollectionEntry<'profile'>;
export type Teaching = CollectionEntry<'teaching'>;
export type Research = CollectionEntry<'research'>;
export type Publication = CollectionEntry<'publications'>;
export type Project = CollectionEntry<'projects'>;

const byOrder = <T extends { data: { order: number; title: string } }>(a: T, b: T) =>
  a.data.order - b.data.order || a.data.title.localeCompare(b.data.title);

export async function getProfile(): Promise<Profile> {
  const all = await getCollection('profile');
  const entry = all[0];
  if (!entry) throw new Error('Missing src/content/profile/profile.md');
  return entry;
}

export async function getSnippet(id: string) {
  const entry = await getEntry('snippets', id);
  if (!entry) throw new Error(`Missing snippet src/content/snippets/${id}.md`);
  return entry;
}

export const getTeaching = async () => (await getCollection('teaching')).sort(byOrder);
export const getResearch = async () => (await getCollection('research')).sort(byOrder);

export const getProjects = async () =>
  (await getCollection('projects', ({ data }) => !data.draft)).sort(byOrder);

/** Publications, newest first. */
export const getPublications = async () =>
  (await getCollection('publications', ({ data }) => !data.draft)).sort(
    (a, b) =>
      b.data.year - a.data.year ||
      (b.data.month ?? 0) - (a.data.month ?? 0) ||
      a.data.title.localeCompare(b.data.title),
  );

/** Display name: "[Preferred name], PhD" style. */
export function displayName(profile: Profile, withPostNominals = true): string {
  const { name, preferredName, postNominals } = profile.data;
  const base = isReal(preferredName) ? preferredName : name;
  return withPostNominals && postNominals ? `${base}, ${postNominals}` : base;
}

/** True when a file referenced by a site path exists in /public. */
export function publicFileExists(sitePath: string): boolean {
  if (!sitePath.startsWith('/')) return false;
  return existsSync(join(process.cwd(), 'public', sitePath));
}

/** Social / scholarly profile links that have genuine URLs. */
export function profileLinks(profile: Profile) {
  const l = profile.data.links;
  const known = [
    { key: 'orcid', label: 'ORCID', url: l.orcid },
    { key: 'googleScholar', label: 'Google Scholar', url: l.googleScholar },
    { key: 'researchGate', label: 'ResearchGate', url: l.researchGate },
    { key: 'github', label: 'GitHub', url: l.github },
    { key: 'linkedin', label: 'LinkedIn', url: l.linkedin },
    { key: 'institutionalProfile', label: 'Institutional profile', url: l.institutionalProfile },
    ...l.other.map((o, i) => ({ key: `other-${i}`, label: o.label, url: o.url })),
  ];
  return known.filter((k) => k.url && !k.url.includes('[') && isReal(k.label));
}
