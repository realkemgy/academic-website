import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { handleContact, _resetLimiter } from '../server/contact/handler.js';
import { validateContact } from '../server/contact/validation.js';
import { MemoryRateLimiter } from '../server/contact/rate-limit.js';
import { _resetGraphToken } from '../server/contact/providers.js';

const SITE = 'https://example.com';
const baseEnv = {
  PUBLIC_SITE_URL: SITE,
  EMAIL_PROVIDER: 'webhook',
  CONTACT_WEBHOOK_URL: 'https://hooks.example.net/contact',
  CONTACT_TO_EMAIL: 'inbox@example.com',
};
const valid = {
  name: 'Ada Lovelace',
  email: 'ada@example.org',
  organisation: 'Analytical Society',
  subject: 'Collaboration',
  message: 'I would like to discuss a collaboration on numerical methods.',
  started: '1000',
};

function req(body, { headers = {}, method = 'POST', json = true } = {}) {
  return new Request(`${SITE}/api/contact`, {
    method,
    headers: {
      Origin: SITE,
      Accept: json ? 'application/json' : 'text/html',
      'Content-Type': json ? 'application/json' : 'application/x-www-form-urlencoded',
      ...headers,
    },
    body: method === 'POST' ? (json ? JSON.stringify(body) : new URLSearchParams(body).toString()) : undefined,
  });
}

function fakeFetch(calls, status = 200, payload = {}) {
  return async (url, init) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify(payload), { status });
  };
}

const opts = (calls, extra = {}) => ({ env: baseEnv, clientIp: '203.0.113.7', fetch: fakeFetch(calls), now: () => 60_000, ...extra });

beforeEach(() => {
  _resetLimiter();
  _resetGraphToken();
});

test('valid submission is delivered and returns ok', async () => {
  const calls = [];
  const res = await handleContact(req(valid), opts(calls));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, baseEnv.CONTACT_WEBHOOK_URL);
  assert.equal(JSON.parse(calls[0].init.body).email, 'ada@example.org');
});

test('form-encoded POST without JavaScript redirects to the thanks page', async () => {
  const res = await handleContact(req(valid, { json: false }), opts([]));
  assert.equal(res.status, 303);
  assert.equal(res.headers.get('Location'), `${SITE}/contact/thanks/`);
});

test('invalid fields return 422 with field errors', async () => {
  const calls = [];
  const res = await handleContact(req({ ...valid, email: 'not-an-email', message: 'short' }), opts(calls));
  assert.equal(res.status, 422);
  const body = await res.json();
  assert.ok(body.errors.email);
  assert.ok(body.errors.message);
  assert.equal(calls.length, 0);
});

test('honeypot submissions are silently dropped', async () => {
  const calls = [];
  const res = await handleContact(req({ ...valid, website: 'http://spam.example' }), opts(calls));
  assert.equal(res.status, 200);
  assert.equal(calls.length, 0);
});

test('submissions faster than three seconds are silently dropped', async () => {
  const calls = [];
  const res = await handleContact(req({ ...valid, started: '59000' }), opts(calls));
  assert.equal(res.status, 200);
  assert.equal(calls.length, 0);
});

test('cross-origin requests are rejected', async () => {
  const res = await handleContact(req(valid, { headers: { Origin: 'https://evil.example' } }), opts([]));
  assert.equal(res.status, 403);
});

test('header injection in subject is rejected', async () => {
  const res = await handleContact(req({ ...valid, subject: 'Hi\r\nBcc: victim@example.com' }), opts([]));
  assert.equal(res.status, 422);
});

test('more than three links is rejected', async () => {
  const message = 'See https://a.example https://b.example https://c.example https://d.example now';
  const res = await handleContact(req({ ...valid, message }), opts([]));
  assert.equal(res.status, 422);
});

test('rate limit returns 429 after the configured number of messages', async () => {
  const env = { ...baseEnv, CONTACT_RATE_LIMIT: '2' };
  for (let i = 0; i < 2; i++) assert.equal((await handleContact(req(valid), opts([], { env }))).status, 200);
  assert.equal((await handleContact(req(valid), opts([], { env }))).status, 429);
});

test('unconfigured provider returns 503 and never sends', async () => {
  const calls = [];
  const res = await handleContact(req(valid), opts(calls, { env: { PUBLIC_SITE_URL: SITE } }));
  assert.equal(res.status, 503);
  assert.equal(calls.length, 0);
});

test('non-POST methods return 405', async () => {
  const res = await handleContact(req(null, { method: 'GET' }), opts([]));
  assert.equal(res.status, 405);
});

test('oversized bodies are refused', async () => {
  const res = await handleContact(req({ ...valid, message: 'x'.repeat(30_000) }), opts([]));
  assert.equal(res.status, 413);
});

test('Turnstile token is required and verified when a secret is set', async () => {
  const env = { ...baseEnv, TURNSTILE_SECRET_KEY: 'secret' };
  const missing = await handleContact(req(valid), opts([], { env }));
  assert.equal(missing.status, 400);

  const calls = [];
  const f = async (url, init) => {
    calls.push(String(url));
    return new Response(JSON.stringify(String(url).includes('siteverify') ? { success: true } : {}), { status: 200 });
  };
  const ok = await handleContact(req({ ...valid, 'cf-turnstile-response': 'token' }), { env, clientIp: '1.1.1.1', fetch: f, now: () => 60_000 });
  assert.equal(ok.status, 200);
  assert.ok(calls[0].includes('siteverify'));
});

test('provider failure returns 502 without leaking details', async () => {
  const res = await handleContact(req(valid), opts([], { fetch: fakeFetch([], 500) }));
  assert.equal(res.status, 502);
  assert.doesNotMatch((await res.json()).message, /webhook|500/i);
});

test('Microsoft Graph provider requests a token then calls sendMail', async () => {
  const env = {
    ...baseEnv,
    EMAIL_PROVIDER: 'graph',
    GRAPH_TENANT_ID: 'tenant',
    GRAPH_CLIENT_ID: 'client',
    GRAPH_CLIENT_SECRET: 'secret',
    GRAPH_SENDER: 'web@example.com',
  };
  const calls = [];
  const f = async (url, init) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('oauth2')) return new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }), { status: 200 });
    return new Response(null, { status: 202 });
  };
  const res = await handleContact(req(valid), { env, clientIp: '1.1.1.1', fetch: f, now: () => 60_000 });
  assert.equal(res.status, 200);
  assert.match(calls[1].url, /graph\.microsoft\.com\/v1\.0\/users\/web%40example\.com\/sendMail$/);
  const msg = JSON.parse(calls[1].init.body).message;
  assert.equal(msg.replyTo[0].emailAddress.address, 'ada@example.org');
});

test('validation normalises whitespace and case', () => {
  const { values, errors } = validateContact({ ...valid, email: '  Ada@Example.ORG ' });
  assert.deepEqual(errors, {});
  assert.equal(values.email, 'ada@example.org');
});

test('rate limiter window expires', () => {
  let t = 0;
  const rl = new MemoryRateLimiter({ limit: 1, windowMs: 1000, now: () => t });
  assert.equal(rl.hit('a'), true);
  assert.equal(rl.hit('a'), false);
  t = 1500;
  assert.equal(rl.hit('a'), true);
});
