/**
 * Cloudflare Pages Function: POST /api/contact
 * Cloudflare Pages detects the /functions directory automatically.
 * Set variables and secrets in the Pages project (Settings > Variables and Secrets).
 */
import { handleContact } from '../../server/contact/handler.js';

interface Env {
  [key: string]: string | undefined;
}

interface PagesContext {
  request: Request;
  env: Env;
}

export const onRequest = (context: PagesContext): Promise<Response> =>
  handleContact(context.request, {
    env: context.env,
    clientIp: context.request.headers.get('CF-Connecting-IP') ?? '',
  });
