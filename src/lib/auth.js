// Session auth helpers (Web Crypto only - runs on Cloudflare Workers).
const enc = new TextEncoder();
export const COOKIE = 'bh_session';
export const SESSION_SECONDS = 60 * 60 * 24 * 7; // 7 days

function b64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(message))));
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Signing key mixes in the password, so changing SITE_PASSWORD signs everyone out.
const signingKey = (env) => `bh1:${env.SESSION_SECRET || ''}:${env.SITE_PASSWORD || ''}`;

export async function passwordOk(env, given) {
  if (!env.SITE_PASSWORD) return false;
  // Compare HMACs of both values so the comparison is constant-time and length-independent.
  const [a, b] = await Promise.all([hmac('pw-compare', String(given ?? '')), hmac('pw-compare', env.SITE_PASSWORD)]);
  return safeEqual(a, b);
}

export async function makeToken(env) {
  const exp = Date.now() + SESSION_SECONDS * 1000;
  return `${exp}.${await hmac(signingKey(env), `v1.${exp}`)}`;
}

export async function verifyToken(env, token) {
  if (!token || !env.SITE_PASSWORD) return false;
  const [exp, sig] = String(token).split('.');
  if (!exp || !sig || !(Number(exp) > Date.now())) return false;
  return safeEqual(await hmac(signingKey(env), `v1.${exp}`), sig);
}

export function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

export const sessionCookie = (token) =>
  `${COOKIE}=${token}; Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
export const clearCookie = () => `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;

export const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  });
