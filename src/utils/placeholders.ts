/**
 * Placeholder handling.
 *
 * Convention: any text inside square brackets, such as [FULL NAME] or
 * [Researcher | Educator], is a placeholder awaiting genuine information.
 * Placeholders are rendered with a visible editor's mark and are excluded from
 * structured data so search engines never receive invented facts.
 */

const PLACEHOLDER = /\[(?!\d+\])[^\[\]\n<>]{2,}\]/g;

/** True when a value is empty or still contains a placeholder. */
export function isPlaceholder(value: string | undefined | null): boolean {
  if (!value || !value.trim()) return true;
  PLACEHOLDER.lastIndex = 0;
  return PLACEHOLDER.test(value);
}

/** True when a value is present and free of placeholders. */
export const isReal = (value: string | undefined | null): value is string => !isPlaceholder(value);

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const MARK = (text: string) =>
  `<mark class="ph" title="Placeholder: replace with genuine information">${text}</mark>`;

/** Escape plain text and wrap placeholders in a visible mark. */
export function markPlaceholders(value: string): string {
  return escapeHtml(value).replace(PLACEHOLDER, (m) => MARK(m));
}

/**
 * Mark placeholders inside rendered HTML (from Markdown). Only text between
 * tags is touched, never attributes.
 */
export function markPlaceholdersInHtml(html: string): string {
  return html.replace(/>([^<]+)</g, (_all, text: string) => `>${text.replace(PLACEHOLDER, (m) => MARK(m))}<`);
}

/** Strip brackets for use in plain-text contexts such as <title>. */
export function plain(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
