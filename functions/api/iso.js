import { json } from '../_lib/auth.js';
import { guard, readJson, HttpError, isObj, clean, DATE_RE } from '../_lib/store.js';

// Isolation Register rows grouped by Scheduled Release Date. Re-uploads replace only the dates they contain,
// so earlier days keep their rows.
export const onRequestPut = guard(async ({ env, request }) => {
  const b = await readJson(request);
  if (!isObj(b) || !isObj(b.byDate)) throw new HttpError('Missing rows');
  const old = (await env.HANDOVER_KV.get('iso', 'json')) || { byDate: {} };
  const now = new Date().toISOString();
  const byDate = { ...(old.byDate || {}) };
  for (const [d, rows] of Object.entries(b.byDate)) {
    if (!DATE_RE.test(d) || !Array.isArray(rows)) throw new HttpError('Bad rows');
    byDate[d] = rows.slice(0, 200).map((r) => ({
      po: clean(r.po, 20), batch: clean(r.batch, 30), item: clean(r.item, 120),
      packed: clean(r.packed, 10), built: r.built ?? null, bestBefore: clean(r.bestBefore, 10),
      status: clean(r.status, 30), release: clean(r.release, 10), finalised: clean(r.finalised, 10),
      assessment: clean(r.assessment, 3000),
    }));
  }
  await env.HANDOVER_KV.put('iso', JSON.stringify({ fileName: clean(b.fileName, 200), uploadedAt: now, byDate }));
  await env.HANDOVER_KV.put('iso:at', now);
  return json({ ok: true, uploadedAt: now, dates: Object.keys(b.byDate).length });
});
