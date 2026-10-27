import { json } from '../_lib/auth.js';
import { guard } from '../_lib/store.js';

// Everything the page needs to render a report (KPI history + isolation register).
export const onRequestGet = guard(async ({ env }) => {
  const [kpi, iso] = await Promise.all([env.HANDOVER_KV.get('kpi', 'json'), env.HANDOVER_KV.get('iso', 'json')]);
  return json({ kpi: kpi || null, iso: iso || null });
});
