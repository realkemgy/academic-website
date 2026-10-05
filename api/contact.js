/**
 * Vercel Function: POST /api/contact
 * Uses the Web-standard handler shape documented by Vercel. Set variables in
 * Project Settings > Environment Variables.
 * See docs/CONTACT-FORM.md for the verification note on Astro projects.
 */
import { handleContact } from '../server/contact/handler.js';

export default {
  /** @param {Request} request */
  async fetch(request) {
    const forwarded = request.headers.get('x-forwarded-for') ?? '';
    return handleContact(request, {
      env: process.env,
      clientIp: forwarded.split(',')[0].trim() || request.headers.get('x-real-ip') || '',
    });
  },
};
