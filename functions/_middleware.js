// Gate EVERYTHING (pages, scripts, data, API) behind the password.
// Only the login endpoint and a few harmless static assets are public.
import { COOKIE, getCookie, verifyToken, json } from './_lib/auth.js';
import { loginPage } from './_lib/loginPage.js';

const PUBLIC_PATHS = [/^\/fonts\//, /^\/favicon\.svg$/];

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);

  if (!env.SITE_PASSWORD) {
    return new Response('Setup incomplete: add a SITE_PASSWORD secret in Cloudflare (Settings > Variables and Secrets).', { status: 500 });
  }
  if (url.pathname === '/api/login' || PUBLIC_PATHS.some((re) => re.test(url.pathname))) return next();

  if (await verifyToken(env, getCookie(request, COOKIE))) {
    const res = await next();
    const out = new Response(res.body, res);
    out.headers.set('Cache-Control', 'private, no-store');
    out.headers.set('X-Robots-Tag', 'noindex, nofollow');
    out.headers.set('Referrer-Policy', 'same-origin');
    out.headers.set('X-Content-Type-Options', 'nosniff');
    return out;
  }

  if (url.pathname.startsWith('/api/')) return json({ error: 'Not signed in' }, 401);
  return new Response(loginPage(), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  });
}
