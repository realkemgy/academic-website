/**
 * Cloudflare Workers (static assets) entry point: an alternative to Cloudflare
 * Pages. Serves the built site from ./dist and handles /api/contact.
 * See deploy/cloudflare-workers/README.md.
 */
import { handleContact } from '../../server/contact/handler.js';

export default {
  /**
   * @param {Request} request
   * @param {Record<string, any> & { ASSETS: { fetch: (r: Request) => Promise<Response> } }} env
   */
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') {
      return handleContact(request, { env, clientIp: request.headers.get('CF-Connecting-IP') ?? '' });
    }
    return env.ASSETS.fetch(request);
  },
};
