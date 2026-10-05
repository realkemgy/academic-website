/**
 * Netlify Function (v2 API): POST /api/contact
 * Netlify bundles this file and its imports. Set variables in
 * Site configuration > Environment variables (scope them to Functions).
 */
import { handleContact } from '../../server/contact/handler.js';

/**
 * @param {Request} request
 * @param {{ ip?: string } | undefined} context
 */
export default async (request, context) =>
  handleContact(request, {
    env: process.env,
    clientIp: context?.ip ?? request.headers.get('x-nf-client-connection-ip') ?? '',
  });

export const config = { path: '/api/contact' };
