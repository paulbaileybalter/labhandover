// Reads the "Physchem Run Charts - Trends" Google Sheet (as an xlsx, or a pasted/exported copy) and
// answers: "what was collected on this one day?"
import { serialToISO, sheetGrid } from './kpi-parse.js';

const s = (v) => (v == null ? '' : String(v).trim());
const toNum = (v) => {
  if (v == null || v === '') return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const n = parseFloat(String(v).replace(/,/g, '').replace('%', ''));
  return Number.isFinite(n) ? n : null;
};
const pct = (v) => {
  const n = toNum(v);
  if (n == null) return null;
  return typeof v === 'string' && v.includes('%') ? n : n <= 1 ? n * 100 : n;
};
export function parseRange(spec) {
  const m = s(spec).match(/(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)/);
  return m ? [parseFloat(m[1]), parseFloat(m[2])] : null;
}
export const outside = (val, range) => val != null && range && (val < range[0] - 1e-9 || val > range[1] + 1e-9);

// ---- CSV (for the exported-copy fallback) ----
function parseCsv(text) {
  const rows = [];
  let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (ch !== '\r') cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

export function sheetsFromWorkbook(XLSX, wb) {
  const out = {};
  for (const name of wb.SheetNames) out[name] = sheetGrid(XLSX, wb.Sheets[name]);
  return out;
}
export function sheetsFromText(text) {
  const out = {};
  const parts = text.split(/^## Sheet name:\s*/m).slice(1);
  for (const p of parts) {
    const nl = p.indexOf('\n');
    out[p.slice(0, nl).trim()] = parseCsv(p.slice(nl + 1));
  }
  return out;
}

const findRow = (g, pred, from = 0) => { for (let i = from; i < g.length; i++) if (g[i].some(pred)) return i; return -1; };

export function parseRunCharts(sheets) {
  const out = { bbt: [], trends: {}, ff: [], ffSpecs: {}, target: 90 };
  const find = (n) => sheets[Object.keys(sheets).find((k) => k.toLowerCase().replace(/\s+/g, '') === n.toLowerCase().replace(/\s+/g, ''))] || [];

  // --- BBT Deviation Log
  const bg = find('BBT Deviation Log');
  const hr = findRow(bg, (c) => s(c) === 'Plato Spec (°P)');
  if (hr < 0) throw new Error('Could not find the BBT Deviation Log table.');
  const H = bg[hr].map(s);
  const ci = (name) => H.indexOf(name);
  const cols = {
    date: ci('Date'), bbt: ci('BBT #'), batch: ci('Batch #'), sku: ci('SKU / Beer Style'),
    pSpec: ci('Plato Spec (°P)'), p: ci('Plato Dev (°P)'), cSpec: ci('Color Spec (SRM)'), c: ci('Color Dev (SRM)'),
    hSpec: ci('pH Spec'), h: ci('pH Dev'), bSpec: ci('BU Spec (IBU)'), b: ci('BU Dev (IBU)'),
    zSpec: ci('Haze Spec (EBC)'), z: ci('Haze (EBC)'), status: ci('Overall Status'), brew: ci('Brewing date'),
    ff: ci('FF gravity'), pdh: ci('Pre-Dry Hop Gravity'), eof: ci('EOF Gravity'),
  };
  for (const row of bg.slice(0, hr)) for (const c of row) { const m = s(c).match(/[≥>=]+\s*(\d+(?:\.\d+)?)\s*%/); if (m) out.target = parseFloat(m[1]); }
  for (let i = hr + 1; i < bg.length; i++) {
    const r = bg[i];
    const date = serialToISO(r[cols.date]);
    if (!date || !s(r[cols.batch])) continue;
    out.bbt.push({
      date, bbt: s(r[cols.bbt]), batch: s(r[cols.batch]), sku: s(r[cols.sku]).toUpperCase(),
      plato: toNum(r[cols.p]), platoSpec: parseRange(r[cols.pSpec]),
      color: toNum(r[cols.c]), colorSpec: parseRange(r[cols.cSpec]),
      ph: toNum(r[cols.h]), phSpec: parseRange(r[cols.hSpec]),
      bu: toNum(r[cols.b]), buSpec: parseRange(r[cols.bSpec]),
      haze: toNum(r[cols.z]), hazeSpec: parseRange(r[cols.zSpec]),
      status: s(r[cols.status]), brewDate: serialToISO(r[cols.brew]),
      ffGravity: toNum(r[cols.ff]), preDH: toNum(r[cols.pdh]), eof: toNum(r[cols.eof]),
    });
  }

  // --- SKU Trends: blocks introduced by "<SKU> | Target Specs:" with a table underneath
  const tg = find('SKU Trends');
  for (let r = 0; r < tg.length; r++) {
    for (let c = 1; c < tg[r].length; c++) {
      if (s(tg[r][c]) !== 'Target Specs:') continue;
      const sku = s(tg[r][c - 1]).toUpperCase();
      const pr = parseRange(s(tg[r][c + 1]).replace(/^Plato:/i, ''));
      const hr2 = parseRange(s(tg[r][c + 2]).replace(/^pH:/i, ''));
      const points = [];
      for (let k = r + 2; k < tg.length; k++) {
        const batch = s(tg[k][c]);
        if (!batch || batch === 'Batch #') break;
        points.push({ brewDate: serialToISO(tg[k][c - 1]), batch, plato: toNum(tg[k][c + 1]), ff: toNum(tg[k][c + 2]), ph: toNum(tg[k][c + 3]) });
      }
      points.sort((a, b) => (a.brewDate || '').localeCompare(b.brewDate || ''));
      out.trends[sku] = { platoSpec: pr, phSpec: hr2, points };
    }
  }

  // --- Forced Ferm
  const fg = find('Forced Ferm Data');
  const fh = findRow(fg, (c) => s(c) === 'Tank / FV #');
  if (fh >= 0) {
    const F = fg[fh].map(s);
    const fc = (n) => F.indexOf(n);
    for (let i = fh + 1; i < fg.length; i++) {
      const r = fg[i];
      if (!/^BA\d+/i.test(s(r[fc('Batch')]))) continue;
      out.ff.push({
        tank: s(r[fc('Tank / FV #')]), batch: s(r[fc('Batch')]), sku: s(r[fc('SKU')]).toUpperCase(),
        start: serialToISO(r[fc('Start Date')]), date: serialToISO(r[fc('Measurement Date')]),
        gravity: toNum(r[fc('Gravity')]), abv: pct(r[fc('ABV')]), rdf: pct(r[fc('RDF%')]),
        preDH: toNum(r[fc('Pre-Dry Hop Gravity')]), eof: toNum(r[fc('EOF Gravity')]),
      });
    }
  }
  for (const r of find('Forced Ferm Specs')) {
    const name = s(r[3]).toLowerCase();
    const lo = toNum(r[4]), hi = toNum(r[5]);
    if (name && lo != null && hi != null) out.ffSpecs[name] = [lo, hi];
  }
  return out;
}

export function ffSpecFor(rc, sku) {
  const k = String(sku || '').toLowerCase();
  if (rc.ffSpecs[k]) return rc.ffSpecs[k];
  if (k.startsWith('black')) return rc.ffSpecs.black || null;
  return null;
}

const SKU_ORDER = ['XPA', 'CPT', 'IPA', 'LAGER', 'HAZY', 'EAZY', 'BLACKLAGER', 'LPA'];
const skuRank = (k) => { const i = SKU_ORDER.indexOf(k); return i < 0 ? 99 : i; };

/** Everything for one calendar day (BBT date / forced-ferm measurement date = that day). */
export function dayView(rc, date, { history = 10 } = {}) {
  const rows = rc.bbt.filter((r) => r.date === date).sort((a, b) => a.sku.localeCompare(b.sku) || a.batch.localeCompare(b.batch));
  const inSpec = (r) => /^in\s*spec/i.test(r.status);
  const total = rows.length;
  const ok = rows.filter(inSpec).length;
  const skus = [...new Set(rows.map((r) => r.sku))].sort((a, b) => skuRank(a) - skuRank(b));
  const devOf = (r) => ({
    plato: outside(r.plato, r.platoSpec), color: outside(r.color, r.colorSpec), ph: outside(r.ph, r.phSpec),
    bu: outside(r.bu, r.buSpec), haze: outside(r.haze, r.hazeSpec),
  });
  const perSku = skus.map((sku) => {
    const rs = rows.filter((r) => r.sku === sku);
    const good = rs.filter(inSpec).length;
    const d = rs.map(devOf);
    const n = (k) => d.filter((x) => x[k]).length;
    return { sku, total: rs.length, ok: good, dev: rs.length - good, rate: (good / rs.length) * 100, plato: n('plato'), color: n('color'), ph: n('ph'), bu: n('bu'), haze: n('haze') };
  });
  const todays = new Set(rows.map((r) => r.batch));
  const charts = skus.map((sku) => {
    const t = rc.trends[sku] || { platoSpec: null, phSpec: null, points: [] };
    let pts = t.points.map((p) => ({ ...p, today: todays.has(p.batch) }));
    for (const r of rows.filter((x) => x.sku === sku)) {
      if (!pts.some((p) => p.batch === r.batch)) pts.push({ brewDate: r.brewDate, batch: r.batch, plato: r.plato, ph: r.ph, ff: r.ffGravity, today: true });
    }
    pts.sort((a, b) => (a.brewDate || '').localeCompare(b.brewDate || ''));
    const last = pts.map((p) => p.today).lastIndexOf(true);
    pts = history === 0 ? pts.filter((p) => p.today) : pts.slice(Math.max(0, last - (history - 1)), last + 1);
    const first = rows.find((r) => r.sku === sku);
    return { sku, platoSpec: t.platoSpec || first?.platoSpec || null, phSpec: t.phSpec || first?.phSpec || null, points: pts };
  });
  const ff = rc.ff.filter((r) => r.date === date && (r.gravity != null || r.abv != null)).sort((a, b) => a.sku.localeCompare(b.sku) || a.batch.localeCompare(b.batch));
  return {
    rows, perSku, charts, ff, devOf, inSpec,
    kpi: { total, ok, dev: total - ok, rate: total ? (ok / total) * 100 : null, target: rc.target },
  };
}
