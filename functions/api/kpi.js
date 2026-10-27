import { json } from '../_lib/auth.js';
import { guard, readJson, HttpError, isObj, clean, DATE_RE } from '../_lib/store.js';

// Receives the figures the browser extracted from "Physchem KPI Reporting" and merges them in KV.
export const onRequestPut = guard(async ({ env, request }) => {
  const b = await readJson(request);
  if (!isObj(b) || !isObj(b.daily)) throw new HttpError('Missing daily data');
  for (const d of Object.keys(b.daily)) if (!DATE_RE.test(d)) throw new HttpError('Bad date key');

  const old = (await env.HANDOVER_KV.get('kpi', 'json')) || {};
  const now = new Date().toISOString();
  const merged = {
    fileName: clean(b.fileName, 200),
    uploadedAt: now,
    daily: { ...(old.daily || {}), ...b.daily },
    fails: { ...(old.fails || {}), ...(isObj(b.fails) ? b.fails : {}) },
    history: {
      phys: { ...(old.history?.phys || {}), ...(isObj(b.history?.phys) ? b.history.phys : {}) },
      micro: { ...(old.history?.micro || {}), ...(isObj(b.history?.micro) ? b.history.micro : {}) },
    },
    targets: isObj(b.targets) ? b.targets : old.targets || { phys: 0.68, micro: 0.73 },
    microCurrent: isObj(b.microCurrent) ? b.microCurrent : null,
  };
  const dates = Object.keys(merged.daily).sort();
  merged.minDate = dates[0] || null;
  merged.maxDate = dates[dates.length - 1] || null;

  await env.HANDOVER_KV.put('kpi', JSON.stringify(merged));
  await env.HANDOVER_KV.put('kpi:at', now);
  return json({ ok: true, uploadedAt: now, minDate: merged.minDate, maxDate: merged.maxDate });
});
