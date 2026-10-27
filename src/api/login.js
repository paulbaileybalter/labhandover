import { passwordOk, makeToken, sessionCookie, json } from '../lib/auth.js';

const MAX_FAILS = 8;       // per IP ...
const WINDOW_SECONDS = 900; // ... per 15 minutes

export async function onRequestPost({ request, env }) {
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const rlKey = `rl:${ip}`;
  const fails = Number((await env.HANDOVER_KV.get(rlKey)) || 0);
  if (fails >= MAX_FAILS) return json({ error: 'Too many attempts. Please wait 15 minutes and try again.' }, 429);

  let body = {};
  try { body = await request.json(); } catch { /* ignore */ }

  if (!(await passwordOk(env, body.password))) {
    await env.HANDOVER_KV.put(rlKey, String(fails + 1), { expirationTtl: WINDOW_SECONDS });
    return json({ error: 'Incorrect password.' }, 401);
  }
  if (fails) await env.HANDOVER_KV.delete(rlKey);
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(await makeToken(env)) });
}
