// @ts-check
/**
 * Astro configuration.
 *
 * Everything host-specific is driven by environment variables so the same
 * source builds identically on Cloudflare, Azure, Vercel, Netlify or a laptop.
 * See .env.example for the full list.
 */
import { existsSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Load a local .env file into process.env when present (Node 20.12+).
// Hosting dashboards inject variables directly, so this only matters locally.
if (existsSync('.env') && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile('.env');
}

const env = process.env;

/** Canonical origin. Choose apex or www here; the host redirects the other. */
const SITE_URL = (env.PUBLIC_SITE_URL || 'https://example.com').replace(/\/+$/, '');

/** Origins the contact form may post to (same-origin by default). */
const contactEndpoint = env.PUBLIC_CONTACT_ENDPOINT || '/api/contact';
const contactOrigin = /^https?:\/\//.test(contactEndpoint) ? new URL(contactEndpoint).origin : null;

/** Optional Cloudflare Turnstile (works on any host). */
const turnstileEnabled = Boolean(env.PUBLIC_TURNSTILE_SITE_KEY);
const TURNSTILE = 'https://challenges.cloudflare.com';

const connectSrc = ["'self'", contactOrigin, turnstileEnabled ? TURNSTILE : null].filter(Boolean).join(' ');
const formAction = ["'self'", contactOrigin].filter(Boolean).join(' ');

export default defineConfig({
  site: SITE_URL,
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // External stylesheets keep the Content Security Policy simple and cacheable.
    inlineStylesheets: 'never',
  },
  markdown: {
    // Prism emits classes instead of inline styles, so code blocks satisfy the CSP.
    syntaxHighlight: 'prism',
  },
  integrations: [
    sitemap({
      // Utility pages stay out of the sitemap.
      filter: (page) => !/\/(404|contact\/thanks|contact\/not-sent)\/?$/.test(page),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
  security: {
    // Astro hashes every script and style it emits and writes a CSP <meta> tag.
    // Header-only directives (frame-ancestors etc.) live in public/_headers,
    // public/staticwebapp.config.json and vercel.json.
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        `connect-src ${connectSrc}`,
        `form-action ${formAction}`,
        `frame-src ${turnstileEnabled ? TURNSTILE : "'none'"}`,
        "object-src 'none'",
        "base-uri 'self'",
      ],
      scriptDirective: {
        resources: ["'self'", ...(turnstileEnabled ? [TURNSTILE] : [])],
      },
      styleDirective: {
        resources: ["'self'"],
      },
    },
  },
});
