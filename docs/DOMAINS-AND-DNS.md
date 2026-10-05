# Custom domain, DNS and HTTPS

This guide assumes the **registrar** (where the domain was bought), the **DNS provider** (where records are edited) and the **host** (where the site runs) may be three different companies. Often the registrar is also the DNS provider, but not always: if the domain's nameservers point somewhere else, records must be edited there.

Find out who runs your DNS: look up the domain's nameservers (`dig NS example.com +short`, or any "NS lookup" website). The records go wherever those nameservers belong.

---

## 1. Choose the canonical hostname

Pick one address as the official one:

| Option | Pros | Cons |
| --- | --- | --- |
| `example.com` (apex) | Shorter, common for personal sites | Apex records cannot be standard CNAMEs, so the DNS provider must support ALIAS/ANAME/CNAME flattening, or you use A records |
| `www.example.com` | A simple CNAME works with every DNS provider; Netlify recommends a subdomain as primary with external DNS | Slightly longer |

Then:
1. Set `PUBLIC_SITE_URL` to it (`https://example.com` or `https://www.example.com`) in the host's production variables and redeploy. Canonical tags, the sitemap and social metadata use it.
2. Add **both** hostnames to the host, and have the host redirect the other one to the canonical one with a permanent redirect (301 or 308). Each host's method is in docs/DEPLOYMENT.md.
3. If the contact form runs on the other hostname too, add it to `CONTACT_ALLOWED_ORIGINS`.

---

## 2. Record types

| Type | What it does | Used for |
| --- | --- | --- |
| **A** | Hostname to an IPv4 address | Apex domain on hosts that publish a fixed IP (Netlify fallback, Vercel) |
| **AAAA** | Hostname to an IPv6 address | Only if the host gives you one. Do not invent one; leave it out otherwise |
| **CNAME** | Hostname to another hostname | `www` (and other subdomains) pointing to the host's address |
| **ALIAS / ANAME / CNAME flattening** | Behaves like a CNAME but is allowed at the apex; the DNS provider resolves it to IPs | Apex domain on Azure Static Web Apps and Netlify (preferred), some others |
| **TXT** | Arbitrary text | Domain ownership verification (Azure apex), email (SPF, DMARC), search-console verification |
| **CAA** | Which certificate authorities may issue certificates | Only matters if you already have CAA records; they must allow the host's CA or HTTPS will fail |
| **NS** | Which nameservers are authoritative | Changed only when moving DNS to a new provider (for example Cloudflare or Netlify DNS) |

---

## 3. What to create, per host

Always copy the exact target from the host's domain screen. Values below are what the hosts document at the time of writing and are given to help you recognise them, not to be typed blindly.

| Host | `www` | Apex `@` | Verification |
| --- | --- | --- | --- |
| Cloudflare Pages | `CNAME www -> <project>.pages.dev` (add the domain in Pages first) | Domain must use Cloudflare nameservers; Cloudflare creates the record | Automatic |
| Azure Static Web Apps | `CNAME www -> <app>.azurestaticapps.net` | `TXT @ <code>` to validate, then `ALIAS @ -> <app>.azurestaticapps.net` (A record to `stableInboundIP` only as a last resort) | CNAME or TXT, shown in portal |
| Vercel | `CNAME www -> <value on your domain card>` | `A @ -> <IP on your domain card>` (often `76.76.21.21`; newer projects may receive another address such as `216.198.79.1`) | Shown on domain card if needed |
| Netlify | `CNAME www -> <site>.netlify.app` | `ALIAS @ -> apex-loadbalancer.netlify.com`, or `A @ -> 75.2.60.5` | Automatic |

**Order of operations:** add the domain in the host's dashboard first, then create DNS records, then wait for validation and the certificate.

---

## 4. www and apex together

A typical setup with the apex as canonical:

```
example.com        ALIAS   <host target>       (or A <IP>)
www.example.com    CNAME   <host target>
```

Both names reach the host; the host redirects `www.example.com` to `https://example.com/...` preserving the path. Swap roles if `www` is canonical.

Avoid "URL forwarding" or "web redirect" features at the registrar where possible. They are often HTTP-only or add their own servers in front of the site. Let the host do the redirect, because it already holds a certificate for both names.

---

## 5. HTTPS and certificates

- All four hosts issue and renew certificates automatically once DNS points at them. Nothing to buy or upload.
- Issuance usually completes within minutes to a few hours after DNS resolves.
- HTTP to HTTPS: Vercel, Netlify and Azure Static Web Apps redirect automatically. On Cloudflare, enable **Always Use HTTPS** for the zone.
- The site sends `Strict-Transport-Security: max-age=31536000` once served over HTTPS. Do not add `preload` or `includeSubDomains` unless every subdomain of the domain serves HTTPS permanently, because browsers will refuse plain HTTP for a year.
- If issuance is stuck: check for an existing CAA record that does not list the host's CA, check that both hostnames resolve to the host (`dig example.com`, `dig www.example.com`), and check that no old AAAA record points somewhere else.

---

## 6. Propagation

- Record changes are visible as soon as caches expire. The TTL on the old record decides how long that takes.
- Typical: minutes to a few hours. Hosts quote up to 24 hours (Netlify), up to 48 hours generally, and up to 72 hours for Azure apex domains.
- Nameserver changes (moving DNS providers) can take up to 48 hours.
- For a planned move, lower the TTL to 300 seconds a day before, make the change, then raise it again.
- Check from outside your network: `dig @1.1.1.1 example.com` and `dig @8.8.8.8 www.example.com`, or an online "DNS propagation" checker.

---

## 7. Email on the same domain

If the domain also receives email (for example `name@example.com`), do not delete existing `MX`, `TXT` (SPF, DKIM, DMARC) or `CNAME` records used by the email provider while changing website records. Website records are only the apex A/ALIAS and the `www` CNAME. If the contact form sends from this domain through Resend, add the DKIM and SPF records Resend gives you so messages are not marked as spam.
