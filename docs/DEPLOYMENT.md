# Deployment guide

The site builds to static files in `dist/` with `npm run build`. Any static host works. This guide covers the four supported hosts step by step. Pick one; the others stay available if you move later.

Common to every host:

| Setting | Value |
| --- | --- |
| Repository | your GitHub repository |
| Production branch | `main` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Node.js | 22.12 or newer (`.nvmrc` contains `22`) |
| Production variables | `PUBLIC_SITE_URL`, `PUBLIC_ALLOW_INDEXING=true` (at launch), `PUBLIC_SHOW_EDITOR_NOTES=false` (at launch) |
| Preview variables | `PUBLIC_ALLOW_INDEXING=false` (always) |

Dashboard menus change over time. If a label below does not match exactly, look for the nearest equivalent; the settings themselves are stable.

---

## 1. Cloudflare Pages

Architecture:

```
GitHub ──► Cloudflare Pages (build) ──► global CDN
                 │
                 ├─ custom domain + HTTPS
                 ├─ functions/api/contact.ts  (Pages Function, optional)
                 └─ Turnstile                 (optional)
```

### Connect the repository
1. Cloudflare dashboard > **Workers & Pages** > **Create** > **Pages** > **Connect to Git**.
2. Authorise GitHub and select the repository.
3. Build settings:
   - Framework preset: **Astro** (or None)
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: leave empty
4. **Save and Deploy.** The first build gives you a `<project>.pages.dev` address.

### Branches and previews
- Settings > **Builds & deployments**: production branch `main`.
- Every other branch and every pull request gets a preview deployment with its own URL, posted on the pull request by the Cloudflare GitHub app.
- To limit previews, set **Preview branch control** to custom branches.

### Node version
Cloudflare's v3 build image defaults to a Node 22 release and reads `.nvmrc` from the repository root, so no setting is needed. To override, add the variable `NODE_VERSION` (for example `22.16.0`).

### Environment variables
Settings > **Variables and Secrets**. Variables are set separately for **Production** and **Preview**.
- Production: `PUBLIC_SITE_URL`, `PUBLIC_ALLOW_INDEXING`, `PUBLIC_SHOW_EDITOR_NOTES`, and the contact-form variables if used.
- Preview: `PUBLIC_ALLOW_INDEXING=false`.
- Mark API keys and client secrets as **Secret** (encrypted).
- Redeploy after changing a `PUBLIC_*` variable.

### Contact form
`functions/api/contact.ts` is detected automatically and served at `/api/contact`. Set the server variables from `.env.example` in the Pages project, then `PUBLIC_CONTACT_FORM_ENABLED=true`, and redeploy. Headers in `public/_headers` do not apply to Function responses; the handler sets its own.

### Custom domain, DNS and HTTPS
1. Project > **Custom domains** > **Set up a custom domain**. Add the canonical hostname, then the other one.
2. **Add the domain in the dashboard before creating DNS records.** Cloudflare's documentation warns that a CNAME added without this step fails to resolve (error 522).
3. Apex (`example.com`): the domain must be a Cloudflare zone, meaning its nameservers point to Cloudflare. Cloudflare then creates the record for you.
4. Subdomain (`www.example.com`) with DNS elsewhere: create `CNAME www -> <project>.pages.dev` at your DNS provider.
5. Certificates are issued automatically. If you have CAA records, they must allow Cloudflare's certificate authorities.
6. In the zone, **SSL/TLS** > **Edge Certificates**: turn on **Always Use HTTPS**.
7. Redirect the non-canonical hostname: **Rules** > **Redirect Rules** (or Bulk Redirects): when hostname equals `www.example.com`, redirect with 301 to `https://example.com` keeping the path and query string. Cloudflare provides a ready-made "www to root" style template in Redirect Rules.
8. Optionally redirect `<project>.pages.dev` to the custom domain (Cloudflare documents this under "Redirecting *.pages.dev to a Custom Domain").

---

## 1b. Cloudflare Workers (alternative)

Cloudflare still supports Pages, but new platform features are being built for Workers. Workers can serve static sites directly ("static assets"). To use it instead of Pages:

1. Copy `deploy/cloudflare-workers/wrangler.jsonc` to the repository root as `wrangler.jsonc`.
2. Workers & Pages > **Create** > **Workers** > **Import a repository**, select the repository. Build command `npm run build`; deploy command `npx wrangler deploy`.
3. The Worker (`deploy/cloudflare-workers/worker.js`) handles `/api/contact`; all other paths are static files from `dist/`, with `404.html` as the not-found page. `public/_headers` is also honoured.
4. Add variables and secrets under the Worker's **Settings** > **Variables and Secrets**.
5. Custom domains: Worker > **Settings** > **Domains & Routes** > **Add** > **Custom domain** (the zone must be on Cloudflare).

Wrangler is not added to `package.json` because Pages does not need it; Cloudflare's build installs it, or run `npm install -D wrangler` if you want to deploy from your computer.

---

## 2. Azure Static Web Apps

Architecture:

```
GitHub ──► GitHub Actions (build site + bundle API) ──► Azure Static Web Apps
                                                           │
                                                           ├─ custom domain + HTTPS
                                                           └─ managed Azure Function /api/contact (optional)
```

The workflow builds in GitHub Actions with the pinned Node version and uploads prebuilt output, so Azure's build service never has to guess versions.

### Create the resource
1. Azure portal > **Create a resource** > **Static Web App**.
2. Subscription, resource group, name; **Plan type: Free** is enough for a personal site (choose Standard if you need features such as a bring-your-own Function App or more custom domains).
3. **Deployment details: Other** (you will add the workflow yourself). If you choose GitHub instead, Azure commits its own workflow; replace its contents with the template below and keep its secret name.
4. Review + create.

### Connect GitHub
1. In the new resource: **Overview** > **Manage deployment token**. Copy the token.
2. GitHub repository > **Settings** > **Secrets and variables** > **Actions**:
   - New **secret** `AZURE_STATIC_WEB_APPS_API_TOKEN` = the token.
   - New **variables**: `PUBLIC_SITE_URL`, `PUBLIC_ALLOW_INDEXING` (`true` at launch), `PUBLIC_SHOW_EDITOR_NOTES` (`false` at launch), `PUBLIC_CONTACT_FORM_ENABLED`, `PUBLIC_TURNSTILE_SITE_KEY`.
3. Copy `deploy/azure/azure-static-web-apps.yml` to `.github/workflows/azure-static-web-apps.yml`, commit to a branch and open a pull request.

### Build configuration (already in the template)
- `npm ci`, `npm run build`, `npm run build:azure-api`
- `app_location: dist`, `api_location: .azure-api`, `skip_app_build: true`, `skip_api_build: true`
- `public/staticwebapp.config.json` is copied into `dist/` by the build. It sets headers, the 404 page and the API runtime (`node:22`). Azure requires this file at the root of the deployed output.

### Previews
Each pull request to `main` gets a staging environment with its own URL, posted on the pull request. Closing the pull request removes it. The template forces `PUBLIC_ALLOW_INDEXING=false` for previews. The Free plan has a limit on concurrent staging environments; close old pull requests.

### Environment configuration for the API
Static Web App > **Settings** > **Environment variables**: add the server-side contact variables (`EMAIL_PROVIDER`, `CONTACT_TO_EMAIL`, provider credentials, optional `TURNSTILE_SECRET_KEY`). These are available to the managed function only, never to the browser. For Microsoft Graph, see docs/CONTACT-FORM.md.

### Optional Azure Function integration
The managed function in `.azure-api/` is enough for a contact form. To use a separate Function App instead (Standard plan): deploy `azure-functions/` as its own app, link it under **APIs**, and remove `api_location` from the workflow.

### Custom domains
1. Static Web App > **Custom domains** > **Add**.
2. Subdomain (`www.example.com`): create `CNAME www -> <app>.azurestaticapps.net` (the exact value is shown), then validate.
3. Apex (`example.com`) with external DNS: Azure shows a TXT validation code. Create `TXT @ <code>`, wait for validation, then create an **ALIAS** (or ANAME, or flattened CNAME) record at `@` pointing to the app's hostname. If your DNS provider supports none of these, Azure allows an A record to the `stableInboundIP` value from the resource's JSON view, but warns that it routes all traffic to a single region and loses global distribution.
4. Apex with Azure DNS: use an alias record set to the Static Web App resource.
5. Select the canonical domain and click **Set default**. Azure then redirects requests for other domains to it.
6. Certificates are issued and renewed automatically. Azure documents up to 72 hours for apex changes to propagate.

---

## 3. Vercel

### Import the repository
1. vercel.com > **Add New** > **Project** > import the GitHub repository.
2. Framework preset: **Astro** (detected; also set in `vercel.json`). Build command `npm run build`, output `dist`. Node version follows `engines` in `package.json` or the project setting (choose 22.x).
3. **Deploy.**

### Previews
Every push to a branch other than `main` creates a preview deployment, and the Vercel GitHub app comments the URL on pull requests.

### Environment variables
Project > **Settings** > **Environment Variables**. Each variable can target Production, Preview and Development separately. Set `PUBLIC_ALLOW_INDEXING=true` for Production only. Redeploy after changing a `PUBLIC_*` variable.

### Contact form (verify before relying on it)
`api/contact.js` uses Vercel's documented Web-standard function shape. Vercel documents root `/api` functions for projects without a framework adapter; this repository has not been verified on a live Vercel project with the Astro preset. After deploying, `curl -X POST https://<project>.vercel.app/api/contact` should return JSON (503 until configured). If it returns 404, either:
- add the official adapter (`npx astro add vercel`) and move the handler to `src/pages/api/contact.ts` with `export const prerender = false`, or
- host the form handler elsewhere and point `PUBLIC_CONTACT_ENDPOINT` to its full URL (add that origin to `CONTACT_ALLOWED_ORIGINS` on the handler).

Security headers come from `vercel.json`. Vercel serves its domains over HTTPS with HSTS.

### Domains
1. Project > **Settings** > **Domains** > **Add**. Add both `example.com` and `www.example.com`.
2. Vercel shows the records to create. For the apex it shows an **A record**; many projects get `76.76.21.21`, but Vercel documents that newer projects may be given a different anycast address (for example `216.198.79.1`). For `www` it shows a **CNAME** to a project-specific target. **Use the values on your domain card**, not values copied from elsewhere.
3. Set the non-canonical domain to **redirect** to the canonical one with a permanent status (301 or 308).
4. Certificates are issued by Let's Encrypt automatically; a CAA record that excludes Let's Encrypt will block issuance.

---

## 4. Netlify

### Connect the repository
1. app.netlify.com > **Add new site** > **Import an existing project** > GitHub > select the repository.
2. Netlify reads `netlify.toml`: build command `npm run build`, publish directory `dist`, functions directory `netlify/functions`, Node 22.
3. **Deploy.**

### Previews
Deploy Previews are created for every pull request. `netlify.toml` sets `PUBLIC_ALLOW_INDEXING=false` for deploy previews and branch deploys.

### Environment variables
Site configuration > **Environment variables**. Values can be scoped (Builds, Functions, Runtime) and given different values per deploy context. Put `PUBLIC_*` values in the Builds scope and contact secrets in the Functions scope.

### Contact form
`netlify/functions/contact.mjs` is served at `/api/contact` through its `config.path`. Set the server variables, then `PUBLIC_CONTACT_FORM_ENABLED=true`, and redeploy.

### Domain setup
1. Domain management > **Add a domain**. When you add the apex or `www`, Netlify adds both and redirects the non-primary one to the **primary domain** automatically.
2. External DNS:
   - `www`: `CNAME www -> <site>.netlify.app`
   - apex: `ALIAS`/`ANAME`/flattened CNAME `@ -> apex-loadbalancer.netlify.com`, or if unsupported, `A @ 75.2.60.5`
3. Or delegate the domain to Netlify DNS by changing nameservers; Netlify then manages records.
4. HTTPS certificates are provisioned automatically after DNS resolves. Netlify documents up to 24 hours for propagation.

---

## Moving between hosts

1. Create the project on the new host using this guide (the repository needs no changes).
2. Copy environment variables across, using `.env.example` as the checklist.
3. Test on the new host's temporary URL.
4. Add the custom domain on the new host, then change DNS records. Lower the TTL of the old records to 300 seconds a day in advance for a fast switch.
5. Keep the old host running until DNS has propagated, then delete it.
