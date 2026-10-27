// Single Worker: password gate -> JSON API (KV) -> static site (assets).
import { COOKIE, getCookie, verifyToken, json } from './lib/auth.js';
import { loginPage } from './lib/loginPage.js';
import * as login from './api/login.js';
import * as logout from './api/logout.js';
import * as data from './api/data.js';
import * as meta from './api/meta.js';
import * as kpi from './api/kpi.js';
import * as iso from './api/iso.js';
import * as notes from './api/notes.js';
import * as runcharts from './api/runcharts.js';

const API = { '/api/login': login, '/api/logout': logout, '/api/data': data, '/api/meta': meta, '/api/kpi': kpi, '/api/iso': iso, '/api/notes': notes, '/api/runcharts': runcharts };
const PUBLIC_PATHS = [/^\/fonts\//, /^\/favicon\.svg$/];

const secure = (res) => {
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'private, no-store');
  out.headers.set('X-Robots-Tag', 'noindex, nofollow');
  out.headers.set('Referrer-Policy', 'same-origin');
  out.headers.set('X-Content-Type-Options', 'nosniff');
  return out;
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (!env.SITE_PASSWORD) {
      return new Response('Setup incomplete: add a SITE_PASSWORD secret (Worker → Settings → Variables and Secrets).', { status: 500 });
    }
    if (!env.HANDOVER_KV) return new Response('Setup incomplete: KV binding HANDOVER_KV is missing.', { status: 500 });

    const isLogin = path === '/api/login';
    const isPublic = PUBLIC_PATHS.some((re) => re.test(path));
    const authed = isLogin || isPublic || (await verifyToken(env, getCookie(request, COOKIE)));

    if (!authed) {
      if (path.startsWith('/api/')) return json({ error: 'Not signed in' }, 401);
      return new Response(loginPage(), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
    }

    if (path.startsWith('/api/')) {
      const mod = API[path];
      if (!mod) return json({ error: 'Not found' }, 404);
      const h = mod[`onRequest${request.method[0]}${request.method.slice(1).toLowerCase()}`];
      if (!h) return json({ error: 'Method not allowed' }, 405);
      return h({ request, env, ctx });
    }
    return secure(await env.ASSETS.fetch(request));
  },
};
