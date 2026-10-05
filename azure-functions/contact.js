/**
 * Azure Functions (Node.js v4 programming model): POST /api/contact
 * Used by Azure Static Web Apps managed functions or a standalone Function App.
 * scripts/build-azure-api.mjs bundles this file with the shared handler into
 * .azure-api/, which the Azure workflow deploys as the API.
 * Set variables in the Static Web App > Settings > Environment variables.
 */
import { app } from '@azure/functions';
import { handleContact } from '../server/contact/handler.js';

app.http('contact', {
  methods: ['POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'contact',
  handler: async (req) => {
    const body = req.method === 'POST' ? await req.text() : undefined;
    const request = new Request(req.url, { method: req.method, headers: new Headers(Object.fromEntries(req.headers)), body });
    const forwarded = req.headers.get('x-forwarded-for') ?? '';
    // SWA forwards "ip:port"; keep the address only.
    const clientIp = forwarded.split(',')[0].trim().replace(/:\d+$/, '');
    const res = await handleContact(request, { env: process.env, clientIp });
    return {
      status: res.status,
      headers: Object.fromEntries(res.headers),
      body: res.status === 204 || res.status === 303 ? undefined : await res.text(),
    };
  },
});
