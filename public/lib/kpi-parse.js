// Reads the "Physchem KPI Reporting" workbook (via SheetJS, passed in) and boils it down to the small
// set of numbers the site needs. Runs in the browser; the raw 90k-row sheet never leaves the device.
import { ALL_KEYS, MONTHS } from './kpi.js';

export function serialToISO(v) {
  if (v instanceof Date) return new Date(v.getTime() + 12 * 3600e3).toISOString().slice(0, 10);
  if (typeof v === 'number') return new Date(Math.round((v - 25569) * 86400e3)).toISOString().slice(0, 10);
  if (typeof v === 'string') {
    let m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/); // dd/mm/yyyy (AU)
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return null;
}

const WANT = new Set(ALL_KEYS);
const truthy = (v) => v === true || String(v).toUpperCase() === 'TRUE';
const falsy = (v) => v === false || String(v).toUpperCase() === 'FALSE';

/** Sheet -> array of rows, always anchored at A1 (some tabs' used range starts at column C). */
export function sheetGrid(XLSX, ws) {
  const r = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  r.s.r = 0; r.s.c = 0;
  ws['!ref'] = XLSX.utils.encode_range(r);
  return XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
}

export const KPI_SHEETS = ['Consolidated Measurements', 'YTD Performance', 'Micro KPI'];

export function extractKpi(XLSX, wb, fileName = '') {
  const grid = (name) => {
    const ws = wb.Sheets[name];
    if (!ws) throw new Error(`The workbook has no "${name}" tab.`);
    return sheetGrid(XLSX, ws);
  };

  // --- Consolidated Measurements -> per-day OK/TOT counters + failure list
  const cm = grid('Consolidated Measurements');
  const daily = {};
  const failsAll = [];
  let maxISO = '';
  for (let i = 1; i < cm.length; i++) {
    const r = cm[i];
    const sec = r[0];
    if (!sec) continue;
    const within = r[12];
    const isOk = truthy(within), isBad = falsy(within);
    if (!isOk && !isBad) continue;
    const date = serialToISO(r[1]);
    if (!date) continue;
    if (date > maxISO) maxISO = date;
    const param = r[8];
    const keys = [`${sec}|${param}`];
    if (param === 'DO' && r[7] === 'Keg') keys.push(`${sec}|DO|Keg`);
    for (const k of keys) {
      if (!WANT.has(k)) continue;
      const day = (daily[date] ||= {});
      const c = (day[k] ||= [0, 0]);
      c[1]++;
      if (isOk) c[0]++;
      else failsAll.push([date, k, r[4] || '', r[5] || '', r[9], r[10], r[11], r[6] || '']);
    }
  }
  if (!maxISO) throw new Error('No dated measurements found in "Consolidated Measurements".');

  // Keep failure detail for the last ~120 days only (keeps KV small)
  const cutoff = new Date(new Date(maxISO).getTime() - 120 * 86400e3).toISOString().slice(0, 10);
  const fails = {};
  for (const [date, ...rest] of failsAll) if (date >= cutoff) (fails[date] ||= []).push(rest);

  // --- Micro KPI header (reporting period) + current plant index
  const mk = grid('Micro KPI');
  const year = Number(mk[2]?.[1]) || Number(maxISO.slice(0, 4));
  const monLabel = String(mk[3]?.[1] || '').slice(0, 3);
  let microCurrent = null;
  for (const row of mk) {
    if (String(row[11] || '').trim().toLowerCase() === 'plant index:' && typeof row[16] === 'number') {
      const mi = MONTHS.indexOf(monLabel);
      if (mi > -1) microCurrent = { ym: `${year}-${String(mi + 1).padStart(2, '0')}`, value: row[16] / 100 };
    }
  }

  // --- YTD Performance -> monthly history + targets
  const ytd = grid('YTD Performance');
  const history = { phys: {}, micro: {} };
  let targets = null;
  for (const row of ytd) {
    const mi = MONTHS.indexOf(String(row[2] || '').trim());
    if (mi < 0) continue;
    const ym = `${year}-${String(mi + 1).padStart(2, '0')}`;
    if (typeof row[3] === 'number') history.phys[ym] = row[3];
    if (typeof row[4] === 'number') history.micro[ym] = row[4];
    if (!targets && typeof row[5] === 'number' && typeof row[6] === 'number') targets = { phys: row[5], micro: row[6] };
  }

  return { fileName, daily, fails, history, targets, microCurrent };
}

export function extractIsolation(XLSX, wb, fileName = '') {
  const ws = wb.Sheets['Isolation Register'];
  if (!ws) throw new Error('The workbook has no "Isolation Register" tab.');
  const g = sheetGrid(XLSX, ws);
  const h = g[0].map((x) => String(x || '').trim().toLowerCase());
  const col = (name) => h.indexOf(name.toLowerCase());
  const c = {
    po: col('Production Order'), packed: col('Date Packed'), batch: col('Batch'), item: col('Item'), built: col('Built'),
    best: col('Best Before'), status: col('Status'), rel: col('Scheduled Release Date'), fin: col('Date Finalised'), ass: col('Assessment'),
  };
  if (c.rel < 0) throw new Error('Could not find the "Scheduled Release Date" column.');
  const byDate = {};
  for (let i = 1; i < g.length; i++) {
    const r = g[i];
    const rel = serialToISO(r[c.rel]);
    if (!rel) continue;
    (byDate[rel] ||= []).push({
      po: r[c.po] == null ? '' : String(r[c.po]), batch: r[c.batch] || '', item: r[c.item] || '',
      packed: serialToISO(r[c.packed]) || '', built: typeof r[c.built] === 'number' ? r[c.built] : null,
      bestBefore: serialToISO(r[c.best]) || '', status: r[c.status] || '', release: rel,
      finalised: serialToISO(r[c.fin]) || '', assessment: r[c.ass] ? String(r[c.ass]).trim() : '',
    });
  }
  return { fileName, byDate };
}
