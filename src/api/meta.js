import { json } from '../lib/auth.js';
import { guard, DATE_RE } from '../lib/store.js';

// Tiny endpoint the open pages poll so other devices see changes within seconds.
export const onRequestGet = guard(async ({ env, request }) => {
  const date = new URL(request.url).searchParams.get('date') || '';
  const [kpiAt, isoAt, notes] = await Promise.all([
    env.HANDOVER_KV.get('kpi:at'),
    env.HANDOVER_KV.get('iso:at'),
    DATE_RE.test(date) ? env.HANDOVER_KV.get(`notes:${date}`, 'json') : null,
  ]);
  return json({ kpiAt: kpiAt || null, isoAt: isoAt || null, notes: notes || null });
});
