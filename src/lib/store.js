import { json } from './auth.js';

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_BODY = 12 * 1024 * 1024; // KV values max out at 25 MiB; stay well below

export async function readJson(request) {
  const text = await request.text();
  if (text.length > MAX_BODY) throw new HttpError('Upload too large', 413);
  try { return JSON.parse(text); } catch { throw new HttpError('Invalid JSON', 400); }
}

export class HttpError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function guard(handler) {
  return async (ctx) => {
    try { return await handler(ctx); }
    catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      return json({ error: 'Server error' }, 500);
    }
  };
}

export const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
export const clean = (s, max) => String(s ?? '').slice(0, max);
