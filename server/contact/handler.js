// @ts-check
/**
 * Platform-neutral contact form handler built on the Web Request/Response
 * API. Each host has a thin adapter that calls handleContact():
 *   functions/api/contact.ts            Cloudflare Pages Functions
 *   deploy/cloudflare-workers/worker.js Cloudflare Workers (static assets)
 *   azure-functions/contact.js          Azure Static Web Apps / Azure Functions
 *   netlify/functions/contact.mjs       Netlify Functions
 *   api/contact.js                      Vercel Functions
 *
 * Order of checks: method, origin, size, parse, honeypot, timing, validation,
 * rate limit, Turnstile, link heuristic, delivery.
 */
import { validateContact } from './validation.js';
import { MemoryRateLimiter } from './rate-limit.js';
import { deliver, providerName, ProviderError } from './providers.js';

/** @typedef {Record<string, string | undefined>} Env */

const MAX_BODY_BYTES = 20_000;
const MIN_FILL_MS = 3_000;

/** One limiter per warm instance. */
let limiter = /** @type {MemoryRateLimiter | null} */ (null);

/** @param {Env} env */
function getLimiter(env) {
  if (!limiter) {
    limiter = new MemoryRateLimiter({
      limit: Number(env.CONTACT_RATE_LIMIT || 5),
      windowMs: Number(env.CONTACT_RATE_WINDOW_SECONDS || 600) * 1000,
    });
  }
  return limiter;
}

/** Test hook. */
export function _resetLimiter() {
  limiter = null;
}

/**
 * @param {number} status
 * @param {Record<string, unknown>} body
 * @param {Record<string, string>} [headers]
 */
function json(status, body, headers = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}

/** @param {string} location */
function redirect(location) {
  return new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });
}

/** @param {Request} request @param {Env} env */
function allowedOrigins(request, env) {
  const configured = (env.CONTACT_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  const site = (env.PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  return new Set([new URL(request.url).origin, ...(site ? [site] : []), ...configured]);
}

/** @param {Request} request @param {Env} env @returns {Record<string, string>} */
function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  if (!origin || !allowedOrigins(request, env).has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    Vary: 'Origin',
  };
}

/** @param {Request} request @returns {Promise<Record<string, unknown>>} */
async function parseBody(request) {
  const type = request.headers.get('Content-Type') || '';
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) throw new RangeError('too large');
  if (type.includes('application/json')) return JSON.parse(text || '{}');
  if (type.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(text));
  throw new TypeError('unsupported content type');
}

/**
 * @param {string} token
 * @param {string} ip
 * @param {Env} env
 * @param {typeof fetch} f
 */
async function verifyTurnstile(token, ip, env, f) {
  if (!token) return false;
  const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY || '', response: token });
  if (ip) body.set('remoteip', ip);
  const res = await f('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  if (!res.ok) return false;
  const data = /** @type {{ success?: boolean }} */ (await res.json());
  return data.success === true;
}

/**
 * @param {Request} request
 * @param {{ env: Env, clientIp?: string, fetch?: typeof fetch, now?: () => number }} options
 * @returns {Promise<Response>}
 */
export async function handleContact(request, { env, clientIp = '', fetch: f = fetch, now = Date.now }) {
  const cors = corsHeaders(request, env);

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (request.method !== 'POST') return json(405, { ok: false, message: 'Method not allowed.' }, { Allow: 'POST', ...cors });

  const origin = request.headers.get('Origin');
  if (origin && !allowedOrigins(request, env).has(origin)) {
    return json(403, { ok: false, message: 'This form can only be submitted from the website.' });
  }

  const wantsJson = (request.headers.get('Accept') || '').includes('application/json');
  const site = (env.PUBLIC_SITE_URL || '').replace(/\/+$/, '');
  const done = (/** @type {boolean} */ success, /** @type {number} */ status, /** @type {Record<string, unknown>} */ body) =>
    wantsJson ? json(status, body, cors) : redirect(`${site}/contact/${success ? 'thanks' : 'not-sent'}/`);

  if (!providerName(env) || !env.CONTACT_TO_EMAIL) {
    return done(false, 503, { ok: false, message: 'The contact form is not configured yet. Please use email.' });
  }

  /** @type {Record<string, unknown>} */
  let raw;
  try {
    raw = await parseBody(request);
  } catch (err) {
    const status = err instanceof RangeError ? 413 : 400;
    return done(false, status, { ok: false, message: 'The message could not be read.' });
  }

  // Honeypot and timing traps: pretend success so automated senders learn nothing.
  if (typeof raw.website === 'string' && raw.website.trim() !== '') return done(true, 200, { ok: true });
  const started = Number(raw.started);
  if (Number.isFinite(started) && started > 0 && now() - started < MIN_FILL_MS) return done(true, 200, { ok: true });

  const { values, errors } = validateContact(raw);
  if (Object.keys(errors).length) {
    return done(false, 422, { ok: false, message: 'Please correct the highlighted fields.', errors });
  }

  if (!getLimiter(env).hit(clientIp || 'unknown')) {
    return wantsJson
      ? json(429, { ok: false, message: 'Too many messages. Please try again later.' }, { 'Retry-After': '600', ...cors })
      : redirect(`${site}/contact/not-sent/`);
  }

  if (env.TURNSTILE_SECRET_KEY) {
    const token = typeof raw['cf-turnstile-response'] === 'string' ? raw['cf-turnstile-response'] : '';
    const ok = await verifyTurnstile(token, clientIp, env, f).catch(() => false);
    if (!ok) return done(false, 400, { ok: false, message: 'The spam check failed. Please reload the page and try again.' });
  }

  const maxLinks = Number(env.CONTACT_MAX_LINKS || 3);
  if ((values.message.match(/https?:\/\//gi) || []).length > maxLinks) {
    return done(false, 422, {
      ok: false,
      message: 'Please correct the highlighted fields.',
      errors: { message: `Include no more than ${maxLinks} links.` },
    });
  }

  const text = [
    'New message from the website contact form',
    '',
    `Name: ${values.name}`,
    `Email: ${values.email}`,
    `Institution / Organisation: ${values.organisation || '(not given)'}`,
    `Subject: ${values.subject}`,
    '',
    'Message:',
    values.message,
    '',
    '--',
    `Sent from ${site || new URL(request.url).origin} at ${new Date(now()).toISOString()}`,
  ].join('\n');

  try {
    await deliver(
      {
        to: env.CONTACT_TO_EMAIL,
        from: env.CONTACT_FROM_EMAIL || '',
        replyTo: values.email,
        replyName: values.name,
        subject: `[Website] ${values.subject}`,
        text,
        fields: values,
      },
      env,
      f,
    );
  } catch (err) {
    // Log the failure type only; never log message contents or personal data.
    console.error('contact: delivery failed', err instanceof ProviderError ? err.message : 'unexpected error');
    return done(false, 502, { ok: false, message: 'The message could not be sent. Please try again later or use email.' });
  }

  return done(true, 200, { ok: true });
}
