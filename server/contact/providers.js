// @ts-check
/**
 * Email delivery providers. Choose one with EMAIL_PROVIDER:
 *   resend  - Resend HTTP API (RESEND_API_KEY)
 *   graph   - Microsoft Graph sendMail with an Entra ID app registration
 *   webhook - POST JSON to any URL (Power Automate, Logic Apps, n8n, Zapier...)
 * All use fetch() only, so no SDKs are bundled.
 */

/** @typedef {import('./validation.js').ContactFields} ContactFields */
/** @typedef {Record<string, string | undefined>} Env */
/** @typedef {{ to: string, from: string, replyTo: string, replyName: string, subject: string, text: string, fields: ContactFields }} Mail */

export class ProviderError extends Error {
  /** @param {string} message @param {number} [status] */
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/** @param {Env} env @param {string} key */
function required(env, key) {
  const v = env[key];
  if (!v) throw new ProviderError(`Missing environment variable ${key}`);
  return v;
}

/** @type {{ token: string, expires: number } | null} */
let graphToken = null;

/** @param {Mail} mail @param {Env} env @param {typeof fetch} f */
async function sendResend(mail, env, f) {
  const res = await f('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${required(env, 'RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: mail.from, to: [mail.to], subject: mail.subject, text: mail.text, reply_to: mail.replyTo }),
  });
  if (!res.ok) throw new ProviderError(`Resend responded ${res.status}`, res.status);
}

/** @param {Env} env @param {typeof fetch} f */
async function getGraphToken(env, f) {
  if (graphToken && graphToken.expires > Date.now() + 60_000) return graphToken.token;
  const tenant = required(env, 'GRAPH_TENANT_ID');
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: required(env, 'GRAPH_CLIENT_ID'),
    client_secret: required(env, 'GRAPH_CLIENT_SECRET'),
    scope: 'https://graph.microsoft.com/.default',
  });
  const res = await f(`https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new ProviderError(`Token endpoint responded ${res.status}`, res.status);
  const json = /** @type {{ access_token: string, expires_in: number }} */ (await res.json());
  graphToken = { token: json.access_token, expires: Date.now() + json.expires_in * 1000 };
  return graphToken.token;
}

/** @param {Mail} mail @param {Env} env @param {typeof fetch} f */
async function sendGraph(mail, env, f) {
  const sender = required(env, 'GRAPH_SENDER'); // mailbox the app may send as
  const token = await getGraphToken(env, f);
  const res = await f(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject: mail.subject,
        body: { contentType: 'Text', content: mail.text },
        toRecipients: [{ emailAddress: { address: mail.to } }],
        replyTo: [{ emailAddress: { address: mail.replyTo, name: mail.replyName } }],
      },
      saveToSentItems: env.GRAPH_SAVE_TO_SENT !== 'false',
    }),
  });
  if (res.status !== 202 && !res.ok) throw new ProviderError(`Graph sendMail responded ${res.status}`, res.status);
}

/** @param {Mail} mail @param {Env} env @param {typeof fetch} f */
async function sendWebhook(mail, env, f) {
  /** @type {Record<string, string>} */
  const headers = { 'Content-Type': 'application/json' };
  if (env.CONTACT_WEBHOOK_SECRET) headers.Authorization = `Bearer ${env.CONTACT_WEBHOOK_SECRET}`;
  const res = await f(required(env, 'CONTACT_WEBHOOK_URL'), {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...mail.fields, receivedAt: new Date().toISOString() }),
  });
  if (!res.ok) throw new ProviderError(`Webhook responded ${res.status}`, res.status);
}

const PROVIDERS = { resend: sendResend, graph: sendGraph, webhook: sendWebhook };

/** @param {Env} env */
export function providerName(env) {
  const name = (env.EMAIL_PROVIDER || '').toLowerCase();
  return name in PROVIDERS ? /** @type {keyof typeof PROVIDERS} */ (name) : null;
}

/** @param {Mail} mail @param {Env} env @param {typeof fetch} f */
export async function deliver(mail, env, f) {
  const name = providerName(env);
  if (!name) throw new ProviderError('EMAIL_PROVIDER is not set to resend, graph or webhook');
  await PROVIDERS[name](mail, env, f);
}

/** Test hook. */
export function _resetGraphToken() {
  graphToken = null;
}
