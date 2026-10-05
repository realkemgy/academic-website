// @ts-check
/**
 * Contact form validation shared by the browser (instant feedback) and every
 * server adapter (authoritative check). Plain JavaScript with JSDoc types so
 * it runs unchanged on Cloudflare, Azure Functions, Netlify, Vercel and Node.
 */

/** @typedef {{ name: string, email: string, organisation: string, subject: string, message: string }} ContactFields */

export const LIMITS = Object.freeze({
  name: 120,
  email: 254,
  organisation: 200,
  subject: 200,
  messageMin: 10,
  message: 5000,
});

const EMAIL = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:".]{2,}$/;
const LINE_BREAK = /[\r\n]/;

/**
 * Trim and coerce raw input (JSON body or form data) into strings.
 * @param {Record<string, unknown>} raw
 * @returns {ContactFields}
 */
export function normalise(raw) {
  const s = (/** @type {unknown} */ v) => (typeof v === 'string' ? v : v == null ? '' : String(v)).trim();
  return {
    name: s(raw.name),
    email: s(raw.email).toLowerCase(),
    organisation: s(raw.organisation),
    subject: s(raw.subject),
    message: s(raw.message).replace(/\r\n/g, '\n'),
  };
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {{ values: ContactFields, errors: Partial<Record<keyof ContactFields, string>> }}
 */
export function validateContact(raw) {
  const values = normalise(raw);
  /** @type {Partial<Record<keyof ContactFields, string>>} */
  const errors = {};

  if (!values.name) errors.name = 'Enter your name.';
  else if (values.name.length > LIMITS.name) errors.name = `Use ${LIMITS.name} characters or fewer.`;
  else if (LINE_BREAK.test(values.name)) errors.name = 'Enter your name on a single line.';

  if (!values.email) errors.email = 'Enter your email address.';
  else if (values.email.length > LIMITS.email || !EMAIL.test(values.email))
    errors.email = 'Enter an email address in the format name@example.org.';

  if (values.organisation.length > LIMITS.organisation)
    errors.organisation = `Use ${LIMITS.organisation} characters or fewer.`;
  else if (LINE_BREAK.test(values.organisation)) errors.organisation = 'Use a single line.';

  if (!values.subject) errors.subject = 'Enter a subject.';
  else if (values.subject.length > LIMITS.subject) errors.subject = `Use ${LIMITS.subject} characters or fewer.`;
  else if (LINE_BREAK.test(values.subject)) errors.subject = 'Enter the subject on a single line.';

  if (!values.message) errors.message = 'Enter a message.';
  else if (values.message.length < LIMITS.messageMin)
    errors.message = `Write at least ${LIMITS.messageMin} characters.`;
  else if (values.message.length > LIMITS.message)
    errors.message = `Shorten the message to ${LIMITS.message.toLocaleString('en-GB')} characters or fewer.`;

  return { values, errors };
}
