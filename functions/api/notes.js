import { json } from '../_lib/auth.js';
import { guard, readJson, HttpError, clean, DATE_RE } from '../_lib/store.js';

export const onRequestGet = guard(async ({ env, request }) => {
  const date = new URL(request.url).searchParams.get('date') || '';
  if (!DATE_RE.test(date)) throw new HttpError('Bad date');
  return json({ notes: (await env.HANDOVER_KV.get(`notes:${date}`, 'json')) || null });
});

export const onRequestPut = guard(async ({ env, request }) => {
  const b = await readJson(request);
  if (!DATE_RE.test(b?.date || '')) throw new HttpError('Bad date');
  const rec = { prepared: clean(b.prepared, 80), text: clean(b.text, 8000), updatedAt: new Date().toISOString() };
  // Notes are small day-sheets; keep them for a year.
  await env.HANDOVER_KV.put(`notes:${b.date}`, JSON.stringify(rec), { expirationTtl: 60 * 60 * 24 * 400 });
  return json({ ok: true, notes: rec });
});
