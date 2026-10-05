/**
 * Site-wide settings that are not academic content.
 *
 * Academic content (name, biography, research, publications ...) lives in
 * src/content/. Values here come from environment variables so each host and
 * each environment (production / preview) can differ without code changes.
 * See .env.example for documentation of each variable.
 */

const env = import.meta.env;

const flag = (value: unknown, fallback: boolean) => {
  if (value === undefined || value === '') return fallback;
  return String(value).toLowerCase() === 'true';
};

export const SITE = {
  /** Canonical origin, e.g. https://example.com (no trailing slash). */
  url: (env.PUBLIC_SITE_URL || 'https://example.com').replace(/\/+$/, ''),

  /** Language of the content (BCP 47). */
  lang: env.PUBLIC_SITE_LANG || 'en-GB',

  /**
   * Search engine indexing. Off by default so a placeholder site or a preview
   * deployment is never indexed. Set PUBLIC_ALLOW_INDEXING=true for production
   * once real content is in place.
   */
  allowIndexing: flag(env.PUBLIC_ALLOW_INDEXING, false),

  /**
   * Editor notes are the dashed yellow boxes that explain where content goes.
   * Visible by default during build-out; set PUBLIC_SHOW_EDITOR_NOTES=false
   * before launch.
   */
  showEditorNotes: flag(env.PUBLIC_SHOW_EDITOR_NOTES, true),

  contact: {
    /** Set to true only when a backend is deployed and configured. */
    formEnabled: flag(env.PUBLIC_CONTACT_FORM_ENABLED, false),
    /** Relative (/api/contact) or absolute URL of the form handler. */
    endpoint: env.PUBLIC_CONTACT_ENDPOINT || '/api/contact',
    /** Cloudflare Turnstile site key (public). Leave empty to disable. */
    turnstileSiteKey: env.PUBLIC_TURNSTILE_SITE_KEY || '',
  },

  /** Default social-sharing image in /public. */
  ogImage: '/images/og-default.png',
} as const;
