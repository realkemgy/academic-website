/**
 * robots.txt, generated at build time. Indexing is blocked unless
 * PUBLIC_ALLOW_INDEXING=true, so previews and placeholder builds stay private.
 */
import type { APIRoute } from 'astro';
import { SITE } from '../config/site';

export const GET: APIRoute = () => {
  const body = SITE.allowIndexing
    ? `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap-index.xml\n`
    : `# Indexing disabled (PUBLIC_ALLOW_INDEXING is not "true").\nUser-agent: *\nDisallow: /\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
