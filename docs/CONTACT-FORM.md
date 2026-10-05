# Contact form

## Architecture

```
Visitor
   │
   ▼
Website form  (src/components/ContactForm.astro)
   │  client-side validation (same rules as the server)
   ▼
POST /api/contact  (or PUBLIC_CONTACT_ENDPOINT)
   │
   ▼
Host adapter  (10 to 30 lines, one per host)
   │  functions/api/contact.ts            Cloudflare Pages Function
   │  deploy/cloudflare-workers/worker.js Cloudflare Worker
   │  azure-functions/contact.js          Azure Static Web Apps / Azure Functions
   │  netlify/functions/contact.mjs       Netlify Function
   │  api/contact.js                      Vercel Function
   ▼
server/contact/handler.js  (platform-neutral, Web Request/Response API)
   │  1. method check (POST; OPTIONS for CORS)
   │  2. origin check (site origin + CONTACT_ALLOWED_ORIGINS)
   │  3. body size limit (20 KB) and content type
   │  4. honeypot field          → silent success, nothing sent
   │  5. timing trap (< 3 s)     → silent success, nothing sent
   │  6. server-side validation  → 422 with field errors
   │  7. rate limit per IP       → 429
   │  8. Turnstile (if secret set) → 400 on failure
   │  9. link limit (default 3)  → 422
   ▼
server/contact/providers.js  → Resend | Microsoft Graph | webhook
   │
   ▼
Academic inbox (Reply-To is the visitor's address)
```

Nothing in this chain is tied to one host. To change host, deploy the matching adapter and copy the environment variables.

The browser never receives a secret. The only key in the page is the optional **public** Turnstile site key.

## Behaviour

- **Disabled by default.** With `PUBLIC_CONTACT_FORM_ENABLED` unset, the form still validates but tells the visitor sending is not active and points to email. Enable it only after the backend works.
- **With JavaScript:** sends JSON in the background and shows a status message (success, validation errors, rate limit, failure) in a live region.
- **Without JavaScript:** a normal form POST; the server redirects to `/contact/thanks/` or `/contact/not-sent/`.
- **Responses:** 200 sent; 303 redirect (no-JS); 400 bad request or Turnstile failure; 403 wrong origin; 405 wrong method; 413 too large; 422 validation; 429 rate limited; 502 provider failure; 503 not configured.
- **Privacy:** the handler logs only failure types, never names, addresses or message text. Messages are not stored by the website.

## Choosing an email provider

Set `EMAIL_PROVIDER` and the matching variables. Also set `CONTACT_TO_EMAIL` (where messages go).

### Option A: Resend
1. Create an account at resend.com, add and verify your sending domain (it gives you DNS records for DKIM and SPF).
2. Create an API key with sending permission only.
3. Variables: `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `CONTACT_FROM_EMAIL=website@example.com` (on the verified domain), `CONTACT_TO_EMAIL`.

### Option B: Microsoft Graph (Microsoft 365 / Exchange Online)
Suitable when the academic or institution uses Microsoft 365. No third-party mail service is involved.

1. **Entra ID** > App registrations > New registration (single tenant). Note the tenant ID and client (application) ID.
2. **Certificates & secrets** > new client secret. Note the value and its expiry date; set a reminder to rotate it.
3. **Scope the app to one mailbox.** Microsoft recommends RBAC for Applications in Exchange Online, which replaces the older Application Access Policies. In Exchange Online PowerShell:
   ```powershell
   New-ServicePrincipal -AppId <client-id> -ObjectId <enterprise-app-object-id> -DisplayName "Website contact form"
   New-ManagementScope -Name "Website sender" -RecipientRestrictionFilter "PrimarySmtpAddress -eq 'website@example.com'"
   New-ManagementRoleAssignment -App <client-id> -Role "Application Mail.Send" -CustomResourceScope "Website sender"
   ```
   Do **not** also grant tenant-wide `Mail.Send` application permission in Entra ID: Microsoft documents that Entra grants and Exchange RBAC grants combine, so a tenant-wide grant would let the app send as any mailbox.
4. Variables: `EMAIL_PROVIDER=graph`, `GRAPH_TENANT_ID`, `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET`, `GRAPH_SENDER=website@example.com`, `CONTACT_TO_EMAIL`. Optional `GRAPH_SAVE_TO_SENT=false`.
5. The handler requests a client-credentials token and calls `POST /v1.0/users/{sender}/sendMail`, which returns 202 on success.

Institutional tenants usually restrict app registrations; this route needs the tenant administrator's agreement.

### Option C: webhook
Posts the validated fields as JSON (`name`, `email`, `organisation`, `subject`, `message`, `receivedAt`) to any HTTPS endpoint: Power Automate, Azure Logic Apps, n8n, Zapier, or your own service.
Variables: `EMAIL_PROVIDER=webhook`, `CONTACT_WEBHOOK_URL`, optional `CONTACT_WEBHOOK_SECRET` (sent as `Authorization: Bearer ...`; check it at the receiving end), `CONTACT_TO_EMAIL` (required by the handler as a configuration check).

## Spam protection layers

| Layer | Default | Notes |
| --- | --- | --- |
| Honeypot field `website` | on | Hidden from people and screen readers; filled by many bots. Silent success |
| Timing trap | on | Submissions within 3 s of page load are dropped silently (needs JavaScript to stamp the start time; skipped otherwise) |
| Validation and length limits | on | Same rules in browser and server (`server/contact/validation.js`); rejects line breaks in single-line fields (header injection) |
| Link limit | 3 | `CONTACT_MAX_LINKS` |
| Origin check | on | Requests from other sites get 403 |
| Rate limit | 5 per 10 min per IP | `CONTACT_RATE_LIMIT`, `CONTACT_RATE_WINDOW_SECONDS` |
| Cloudflare Turnstile | off | Set `PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`. Cloudflare documents that Turnstile works on any website, not only Cloudflare-hosted ones. The CSP is adjusted automatically at build time |

### About the rate limit
The built-in limiter keeps counts in memory. Serverless platforms run many short-lived instances, so this only limits bursts that reach the same warm instance. It is a useful layer, not a guarantee. For a hard limit:
- **Cloudflare:** a WAF rate limiting rule on `/api/contact` (Security > WAF > Rate limiting rules).
- **Azure:** put Azure Front Door with a WAF rate-limit rule in front, or use a Function App with a shared store (Azure Table Storage or Redis) for counts.
- **Vercel / Netlify:** their firewall or rate-limiting features where your plan includes them, or a shared store such as Upstash Redis.

## Testing

```bash
npm test
```

Unit tests cover validation, honeypot, timing, origin, size limit, header injection, link limit, rate limit, Turnstile verification, provider failure handling and the Graph token and sendMail flow, using stubbed network calls.

Not covered by automated tests: the adapters on the live platforms. After deploying, test end to end:

```bash
curl -i -X POST https://example.com/api/contact \
  -H "Origin: https://example.com" -H "Accept: application/json" -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"you@example.org","subject":"Test","message":"End-to-end test message."}'
```

Expect `200 {"ok":true}` and an email in `CONTACT_TO_EMAIL`. A `503` means variables are missing for the function.
