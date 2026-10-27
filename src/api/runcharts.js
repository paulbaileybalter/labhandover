import { json } from '../lib/auth.js';
import { guard } from '../lib/store.js';

const DEFAULT_SHEET = '1NlR7BUYKYI3ghheNszJX8ByaShJFoNTj1nK_sDswfgw'; // Physchem Run Charts - Trends

// Pulls the live Google Sheet as an .xlsx so the browser can read every tab exactly as laid out.
// The sheet must be shared as "Anyone with the link can view".
export const onRequestGet = guard(async ({ env }) => {
  const id = env.RUNCHARTS_SHEET_ID || DEFAULT_SHEET;
  let res;
  try {
    res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`, {
      redirect: 'follow',
      cf: { cacheTtl: 60, cacheEverything: true },
    });
  } catch {
    return json({ error: 'unreachable' }, 502);
  }
  const buf = await res.arrayBuffer();
  const head = new Uint8Array(buf.slice(0, 2));
  const isZip = head[0] === 0x50 && head[1] === 0x4b; // "PK" = real xlsx, not a Google sign-in page
  if (!res.ok || !isZip) return json({ error: 'not_shared', status: res.status }, 502);
  return new Response(buf, {
    headers: { 'Content-Type': 'application/octet-stream', 'Cache-Control': 'private, no-store', 'X-Fetched-At': new Date().toISOString() },
  });
});
