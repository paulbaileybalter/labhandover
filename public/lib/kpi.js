// Physchem KPI maths - mirrors the "Month" tab of Physchem KPI Reporting, but for a single day.
// Pure functions, no DOM, so it runs in the browser and in Node tests.

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// src = [section, parameter] pairs exactly as they appear in 'Consolidated Measurements'.
// half = grey "I.S." rows in the sheet: failures only cost 50% of the score.
export const STAGES = [
  {
    id: 'brewhouse', title: 'Brewhouse', icon: 'kettle', accent: '#FDAA63',
    rows: [
      { label: 'OE', src: [['Brewhouse', 'Knockout Gravity']] },
      { label: 'Wort pH', src: [['Brewhouse', 'Knockout PH']] },
    ],
    index: { label: 'Brewhouse Index', sub: 'Daily BH index', use: [0, 1] },
  },
  {
    id: 'fermentation', title: 'Fermentation', icon: 'tank', accent: '#7566A0',
    rows: [
      { label: 'Yeast Generation', src: [['Fermentation', 'Yeast Gen']], half: true },
      { label: 'pH', src: [['Fermentation', 'PH']] },
      { label: 'Tdia (TVDK)', src: [['Fermentation', 'TVDK']] },
      { label: 'RDF', src: [['Fermentation', 'RDF%']] },
    ],
    index: { label: 'Fermentation Index', sub: 'Daily Ferm index', use: [0, 1, 2, 3] },
  },
  {
    id: 'cold', title: 'Cold Aging', icon: 'snow', accent: '#99D6EA',
    rows: [{ label: 'DO', src: [] }], // no feed in the workbook - scores 100, as in the Month tab
    index: { label: 'Cold Aging Index', sub: 'Daily Aging index', use: [0] },
  },
  {
    id: 'filtration', title: 'Filtration / BBT', icon: 'filter', accent: '#47D7AC',
    rows: [
      { label: 'ABV', src: [['BBT', 'ABV in BBT (V/V%)']] },
      { label: 'AE', src: [['BBT', 'Gravity']], half: true },
      { label: 'pH', src: [['BBT', 'PH Level']] },
      { label: 'Color', src: [['BBT', 'Colour (EBC)']], half: true },
      { label: 'Haze (**)', src: [['BBT', 'BBT Turbidity (EBC)']] },
      { label: 'BBT DO', src: [['BBT', 'DO All In']] },
      { label: 'Bitterness', src: [['BBT', 'Bitterness (BU)']], half: true },
      { label: 'Foam (*)', src: [['BBT', 'Foam']], half: true },
      { label: 'Forcing Test (*)', src: [['BBT', 'Forcing']], half: true },
      { label: 'SO2 (*)', src: [['BBT', 'SO2']], half: true },
    ],
    index: { label: 'Filtration / BBT Index', sub: 'Daily Filt/BBT index', use: [0, 1, 2, 3, 4, 5, 6] },
  },
  {
    id: 'packaging', title: 'Packaging', icon: 'can', accent: '#FFD637',
    rows: [
      { label: 'CO2 Saturation', src: [['Pack', 'CO2']] },
      { label: 'TPO / Dokegs', src: [['Pack', 'TPO'], ['Pack', 'DO|Keg']] },
      { label: 'Fills - Individuals', src: [['Pack', 'Single Can Weight']] },
      { label: 'Fills - Weekly Avg', src: [['Pack', 'Average Can Weight']], half: true },
      { label: 'Torques / Seams', src: [['Pack', 'Seam Check']] },
    ],
    index: { label: 'Packaging Index', sub: 'Daily Package index', use: [0, 1, 2, 3, 4] },
  },
];

export const keyOf = ([sec, param]) => `${sec}|${param}`;
export const ALL_KEYS = [...new Set(STAGES.flatMap((s) => s.rows.flatMap((r) => r.src.map(keyOf))))];

const num = (v) => Number(v) || 0;

/** Sum the [ok, tot] counters for a set of dates. */
export function sumDays(daily, dates) {
  const out = {};
  for (const d of dates) {
    const day = daily?.[d];
    if (!day) continue;
    for (const [k, [ok, tot]] of Object.entries(day)) {
      const c = (out[k] ||= [0, 0]);
      c[0] += num(ok);
      c[1] += num(tot);
    }
  }
  return out;
}

/** Score rows + indices from counters. */
export function computeIndex(counts) {
  const stages = STAGES.map((st) => {
    const rows = st.rows.map((r) => {
      let ok = 0, tot = 0;
      for (const s of r.src) {
        const c = counts[keyOf(s)];
        if (c) { ok += c[0]; tot += c[1]; }
      }
      const is = tot === 0 ? 100 : r.half ? ((ok + (tot - ok) / 2) * 100) / tot : (ok * 100) / tot;
      return { label: r.label, half: !!r.half, ok, tot, is, sampled: tot > 0 };
    });
    const idx = st.index.use.reduce((p, i) => p * (rows[i].is / 100), 1) * 100;
    return { id: st.id, title: st.title, icon: st.icon, accent: st.accent, rows, index: { label: st.index.label, sub: st.index.sub, value: idx } };
  });
  const [bh, fe, ca, fi, pk] = stages.map((s) => s.index.value);
  const brewing = (bh * 2) / 17 + (fe * 4) / 17 + (ca * 1) / 17 + (fi * 10) / 17;
  const plant = (brewing / 100) * pk;
  const allRows = stages.flatMap((s) => s.rows);
  const sampleOk = allRows.reduce((a, r) => a + r.ok, 0);
  const sampleTot = allRows.reduce((a, r) => a + r.tot, 0);
  return { stages, brewing, packaging: pk, plant, sampleOk, sampleTot };
}

export const dayIndex = (kpi, date) => computeIndex(sumDays(kpi?.daily, [date]));

export function monthIndex(kpi, ym, upTo = '9999-12-31') {
  const dates = Object.keys(kpi?.daily || {}).filter((d) => d.startsWith(ym) && d <= upTo);
  return { ...computeIndex(sumDays(kpi?.daily, dates)), days: dates.length };
}

/** Rolling window of `n` months ending in the month of `date` -> [{ym,label,phys,micro,physMtd,microMtd}] (values are fractions). */
export function rollingMonths(kpi, date, n = 6) {
  const [y, m] = date.split('-').map(Number);
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const idx = y * 12 + (m - 1) - i;
    const yy = Math.floor(idx / 12), mm = (idx % 12) + 1;
    const ym = `${yy}-${String(mm).padStart(2, '0')}`;
    const isCurrent = i === 0;
    let phys = kpi?.history?.phys?.[ym];
    let micro = kpi?.history?.micro?.[ym];
    let physMtd = false, microMtd = false;
    if (phys == null) {
      const mi = monthIndex(kpi, ym, isCurrent ? date : undefined);
      if (mi.days > 0) { phys = mi.plant / 100; physMtd = isCurrent; }
    }
    if (micro == null && kpi?.microCurrent?.ym === ym) { micro = kpi.microCurrent.value; microMtd = isCurrent; }
    out.push({ ym, label: MONTHS[mm - 1], year: yy, phys: phys ?? null, micro: micro ?? null, physMtd, microMtd });
  }
  return out;
}
