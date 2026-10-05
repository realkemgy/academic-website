/**
 * Structured data (schema.org JSON-LD). Builders return null when the data
 * they need is still a placeholder, so no invented facts are ever published.
 */
import { SITE } from '../config/site';
import { isReal } from './placeholders';
import type { Profile, Publication } from './content';
import { venue } from './citation';

export const absolute = (path: string) => new URL(path, SITE.url + '/').toString();

export function personJsonLd(profile: Profile, sameAs: string[]) {
  const d = profile.data;
  if (!isReal(d.name)) return null;
  const person: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': absolute('/#person'),
    name: d.name,
    url: absolute('/'),
  };
  if (isReal(d.title)) person.jobTitle = d.title;
  if (isReal(d.institution)) {
    person.affiliation = {
      '@type': 'CollegeOrUniversity',
      name: d.institution,
      ...(isReal(d.department) ? { department: { '@type': 'Organization', name: d.department } } : {}),
    };
  }
  if (isReal(d.email)) person.email = `mailto:${d.email}`;
  if (sameAs.length) person.sameAs = sameAs;
  return person;
}

export function websiteJsonLd(siteName: string) {
  if (!isReal(siteName)) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': absolute('/#website'),
    name: siteName,
    url: absolute('/'),
    inLanguage: SITE.lang,
  };
}

export function breadcrumbJsonLd(items: { name: string; href: string }[]) {
  if (items.length < 2) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: absolute(item.href),
    })),
  };
}

export function scholarlyArticleJsonLd(pub: Publication, path: string) {
  const p = pub.data;
  const article: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: p.title,
    name: p.title,
    author: p.authors.map((name) => ({ '@type': 'Person', name })),
    datePublished: [p.year, p.month && String(p.month).padStart(2, '0'), p.day && String(p.day).padStart(2, '0')]
      .filter(Boolean)
      .join('-'),
    url: absolute(path),
  };
  if (p.abstract) article.abstract = p.abstract;
  if (p.keywords.length) article.keywords = p.keywords.join(', ');
  if (p.doi) {
    article.sameAs = `https://doi.org/${p.doi}`;
    article.identifier = { '@type': 'PropertyValue', propertyID: 'DOI', value: p.doi };
  }
  const v = venue(p);
  if (v) article.isPartOf = { '@type': p.journal ? 'Periodical' : 'CreativeWork', name: v };
  return article;
}
