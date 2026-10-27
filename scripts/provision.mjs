// Creates (if missing) the Pages project + KV namespace, binds them, and sets the secrets.
// Safe to run on every deploy. Needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID.
const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: acct, SITE_PASSWORD, SESSION_SECRET, RUNCHARTS_SHEET_ID } = process.env;
const PROJECT = process.env.PAGES_PROJECT || 'balter-lab-handover';
const KV_TITLE = process.env.KV_TITLE || 'balter-lab-handover-kv';
if (!token || !acct) { console.error('Missing CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID'); process.exit(1); }

const api = async (path, method = 'GET', body) => {
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) { const e = new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(json.errors || json)}`); e.status = res.status; throw e; }
  return json.result;
};

// 1. KV namespace
let ns = (await api('/storage/kv/namespaces?per_page=100')).find((n) => n.title === KV_TITLE);
if (!ns) { ns = await api('/storage/kv/namespaces', 'POST', { title: KV_TITLE }); console.log('Created KV namespace', KV_TITLE); }
else console.log('KV namespace exists:', KV_TITLE);

// 2. Pages project
try { await api(`/pages/projects/${PROJECT}`); console.log('Pages project exists:', PROJECT); }
catch (e) { if (e.status !== 404) throw e; await api('/pages/projects', 'POST', { name: PROJECT, production_branch: 'main' }); console.log('Created Pages project', PROJECT); }

// 3. Bindings + secrets (production and preview)
const env_vars = {};
if (SITE_PASSWORD) env_vars.SITE_PASSWORD = { type: 'secret_text', value: SITE_PASSWORD };
if (SESSION_SECRET) env_vars.SESSION_SECRET = { type: 'secret_text', value: SESSION_SECRET };
if (RUNCHARTS_SHEET_ID) env_vars.RUNCHARTS_SHEET_ID = { type: 'plain_text', value: RUNCHARTS_SHEET_ID };
const cfg = { kv_namespaces: { HANDOVER_KV: { namespace_id: ns.id } }, compatibility_date: '2025-07-01', ...(Object.keys(env_vars).length ? { env_vars } : {}) };
await api(`/pages/projects/${PROJECT}`, 'PATCH', { deployment_configs: { production: cfg, preview: cfg } });
console.log(`Bound HANDOVER_KV and updated settings. Site will be at https://${PROJECT}.pages.dev`);
