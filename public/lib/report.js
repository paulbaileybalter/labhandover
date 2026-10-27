// Builds the handover as ONE block of table-based HTML with inline styles.
// The website shows it as-is, and the email is the very same markup (graphics swapped to PNG) - so they match.
import { C, esc, glassSvg, iconSvg, kpiLineChart, runChart } from './charts.js';
import { STAGES, dayIndex, rollingMonths, MONTHS } from './kpi.js';
import { dayView, ffSpecFor, parseRange, outside } from './runcharts.js';

export const FONT = "font-family:'Lexend','Segoe UI',Arial,sans-serif;";
const W = 760;

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const utc = (iso) => new Date(`${iso}T00:00:00Z`);
export const longDate = (iso) => { const d = utc(iso); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS_LONG[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
export const shortDate = (iso) => { const d = utc(iso); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const dmy = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const n0 = (v) => (v == null ? '' : Math.round(v).toLocaleString('en-AU'));
const n1 = (v) => (v == null ? '' : v.toFixed(1));
const n2 = (v) => (v == null ? '' : v.toFixed(2));
const trim = (v) => (v == null ? '' : String(Math.round(v * 100) / 100));
const rangeTxt = (r) => (r ? `${trim(r[0])} – ${trim(r[1])}` : '');

const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 161 161" width="52" height="52" role="img" aria-label="Balter Brewing"><path fill="#47D7AC" d="M136.3,70.4l-9.4-9.4c-1.6-1.6-4.3-1.6-6,0-1.6,1.6-1.6,4.3,0,6l2.3,2.3c-9.6,13.2-25.2,21.7-42.7,21.7s-33.1-8.6-42.7-21.8l2.3-2.3c1.6-1.6,1.6-4.3,0-6-1.6-1.6-4.3-1.6-6,0l-9.4,9.4c-1.6,1.6-1.6,4.3,0,6,.8.8,1.9,1.2,3,1.2s2.2-.4,3-1.2l1.1-1.1c11.2,14.7,28.9,24.2,48.7,24.2s37.5-9.5,48.7-24.2l1.1,1.1c.8.8,1.9,1.2,3,1.2s2.2-.4,3-1.2c1.6-1.6,1.6-4.3,0-6"/><path fill="#47D7AC" d="M152.5,8.5v144H8.5V8.5h144M161,0H0v161h161V0h0Z"/></svg>`;

const tbl = (style, inner, w = '100%') =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${w}" style="border-collapse:collapse;${FONT}${style}">${inner}</table>`;
const td = (style, inner, attrs = '') => `<td ${attrs} style="${FONT}${style}">${inner}</td>`;

// ---------- small components ----------
function pill(v, { muted = false } = {}) {
  if (muted) return `<span style="color:${C.muted};font-size:12px;">${n2(v)}</span>`;
  const [bg, fg, fw] = v >= 95 ? [C.tealT, '#000', 600] : v >= 90 ? [C.orangeT, '#7A410A', 700] : [C.orange, '#000', 700];
  return `<span style="display:inline-block;min-width:58px;padding:3px 8px;border-radius:999px;background:${bg};color:${fg};font-weight:${fw};font-size:12.5px;text-align:center;">${n2(v)}</span>`;
}

function chip(icon, bg, size = 30) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr><td width="${size}" height="${size}" align="center" valign="middle" style="width:${size}px;height:${size}px;background:${bg};border-radius:9px;line-height:0;font-size:0;">${iconSvg(icon, { size: Math.round(size * 0.66) })}</td></tr></table>`;
}

function section(title, sub, icon, accent, body) {
  return `<tr>${td('padding:26px 28px 0;', `
    ${tbl('', `<tr><td width="42" valign="middle" style="width:42px;">${chip(icon, accent, 34)}</td>
      ${td('padding-left:2px;', `<div style="font-size:17px;font-weight:700;letter-spacing:-.005em;color:#000;">${esc(title)}</div>${sub ? `<div style="font-size:12px;color:${C.muted};margin-top:2px;">${sub}</div>` : ''}`)}</tr>`)}
    <div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>${body}`)}</tr>`;
}

const notice = (msg, bg = C.skyT) => `<div style="background:${bg};border-radius:10px;padding:12px 14px;font-size:13px;color:#000;line-height:1.45;">${msg}</div>`;

function tiles(items) {
  const cells = items.map((t, i) => `<td width="${Math.floor(100 / items.length)}%" valign="top" style="${FONT}${i ? 'padding-left:10px;' : ''}">
    ${tbl(`border:1px solid ${C.line};border-radius:12px;border-collapse:separate;`, `<tr><td style="height:4px;line-height:4px;font-size:0;background:${t.color};border-radius:12px 12px 0 0;">&nbsp;</td></tr>
    <tr>${td('padding:11px 14px 13px;', `<div style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:${C.muted};font-weight:600;">${esc(t.label)}</div>
      <div style="font-size:27px;font-weight:700;line-height:1.15;margin-top:4px;color:#000;">${t.value}</div>
      <div style="font-size:11.5px;color:${C.muted};margin-top:2px;">${t.sub || '&nbsp;'}</div>`)}</tr>`)}</td>`).join('');
  return tbl('', `<tr>${cells}</tr>`);
}

const th = (txt, align = 'center', extra = '') => td(`padding:7px 8px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:${C.muted};font-weight:600;text-align:${align};border-bottom:1.5px solid #000;${extra}`, txt);

// ---------- sections ----------
function physchemTable(idx) {
  const stageRow = (st) => {
    const tint = { brewhouse: C.orangeT, fermentation: C.purpleT, cold: C.skyT, filtration: C.tealT, packaging: C.paleT }[st.id];
    return `<tr><td style="${FONT}background:${tint};padding:9px 12px;border-top:6px solid #fff;">${tbl('', `<tr><td width="40" style="width:40px;">${chip(st.icon, st.accent, 30)}</td>${td('font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#000;', esc(st.title))}</tr>`)}</td>
      ${['OK', 'TOT', 'I.S.'].map((h) => td(`background:${tint};border-top:6px solid #fff;text-align:center;font-size:10.5px;letter-spacing:.1em;font-weight:700;color:#000;`, h)).join('')}</tr>`;
  };
  const paramRows = (st) => st.rows.map((r) => `<tr>${td(`padding:7px 12px;font-size:13px;border-top:1px solid ${C.line};color:#000;`, `${esc(r.label)}${r.half ? ` <span style="font-size:10px;color:${C.muted};border:1px solid ${C.line};border-radius:6px;padding:1px 5px;margin-left:4px;">½ weight</span>` : ''}`)}
      ${td(`width:64px;text-align:center;font-size:13px;border-top:1px solid ${C.line};color:${r.sampled ? '#000' : C.muted};`, r.sampled ? n0(r.ok) : '–')}
      ${td(`width:64px;text-align:center;font-size:13px;border-top:1px solid ${C.line};color:${r.sampled ? '#000' : C.muted};`, r.sampled ? n0(r.tot) : '–')}
      ${td(`width:96px;text-align:center;border-top:1px solid ${C.line};`, pill(r.is, { muted: !r.sampled }))}</tr>`).join('');
  const idxRow = (label, sub, v, bg, big = false) => `<tr>${td(`background:${bg};padding:${big ? 13 : 9}px 12px;font-size:${big ? 15 : 13}px;font-weight:700;color:#000;border-top:1px solid #fff;`, `${esc(label)}${sub ? ` <span style="font-weight:400;font-size:11px;color:#3a382f;">· ${esc(sub)}</span>` : ''}`, 'colspan="3"')}
      ${td(`background:${bg};text-align:center;font-size:${big ? 20 : 14}px;font-weight:700;color:#000;border-top:1px solid #fff;`, n2(v))}</tr>`;

  const body = idx.stages.map((st, i) => {
    let h = stageRow(st) + paramRows(st) + idxRow(st.index.label, st.index.sub, st.index.value, C.paleT);
    if (st.id === 'filtration') h += idxRow('BREWING INDEX', 'Daily brewing index', idx.brewing, C.sky, true);
    if (st.id === 'packaging') h += idxRow('PACKAGING INDEX', '', idx.packaging, C.sky, true) + idxRow('PLANT INDEX', 'Brewing × Packaging', idx.plant, C.orange, true);
    return h;
  }).join('');
  return tbl(`border:1px solid ${C.line};`, body) +
    `<div style="font-size:10.5px;color:${C.muted};margin-top:8px;line-height:1.5;">(*) Foam, forcing test and SO2 are measured on filled bottles. (**) For Ariane treated beers, results in the yellow or red zone at EITHER 25° or 90° are included. ½ weight rows only lose 50% of the score for a miss. “–” = nothing sampled today (scores 100).</div>`;
}

function failsTable(kpi, date) {
  const list = kpi?.fails?.[date] || [];
  if (!list.length) return notice('No out-of-spec KPI results were recorded on this date.', C.tealT);
  const label = {};
  for (const st of STAGES) for (const r of st.rows) for (const [sec, p] of r.src) label[`${sec}|${p}`] = { stage: st.title, name: r.label, id: st.id };
  const order = Object.fromEntries(STAGES.map((s, i) => [s.id, i]));
  const rows = list.map(([k, batch, sku, val, lo, hi]) => ({ ...(label[k] || { stage: k, name: k, id: '' }), batch, sku, val, lo, hi }))
    .sort((a, b) => (order[a.id] ?? 9) - (order[b.id] ?? 9) || a.name.localeCompare(b.name) || String(a.batch).localeCompare(String(b.batch)));
  const CAP = 40;
  const specTxt = (lo, hi) => (lo != null && hi != null ? `${trim(lo)} – ${trim(hi)}` : lo != null ? `≥ ${trim(lo)}` : hi != null ? `≤ ${trim(hi)}` : '');
  const body = rows.slice(0, CAP).map((r) => `<tr>${td(`padding:6px 8px;font-size:12px;border-top:1px solid ${C.line};`, esc(r.stage))}${td(`padding:6px 8px;font-size:12px;border-top:1px solid ${C.line};font-weight:600;`, esc(r.name))}
    ${td(`padding:6px 8px;font-size:12px;border-top:1px solid ${C.line};`, esc(r.batch))}${td(`padding:6px 8px;font-size:12px;border-top:1px solid ${C.line};`, esc(r.sku))}
    ${td(`padding:6px 8px;font-size:12px;border-top:1px solid ${C.line};text-align:center;`, `<span style="background:${C.orangeT};border-radius:6px;padding:2px 7px;font-weight:700;">${esc(trim(Number(r.val)))}</span>`)}
    ${td(`padding:6px 8px;font-size:12px;border-top:1px solid ${C.line};text-align:center;color:${C.muted};`, esc(specTxt(r.lo, r.hi)))}</tr>`).join('');
  return tbl(`border:1px solid ${C.line};`, `<tr>${th('Stage', 'left')}${th('Parameter', 'left')}${th('Batch', 'left')}${th('SKU', 'left')}${th('Result')}${th('Spec')}</tr>${body}`) +
    `<div style="font-size:11px;color:${C.muted};margin-top:6px;">${rows.length} out-of-spec result${rows.length === 1 ? '' : 's'}${rows.length > CAP ? ` (first ${CAP} shown)` : ''}.</div>`;
}

function ytdSection(kpi, date) {
  const months = rollingMonths(kpi, date, 6);
  const have = months.some((m) => m.phys != null || m.micro != null);
  const year = date.slice(0, 4);
  const first = months[0], last = months[months.length - 1];
  const sub = `Rolling six months · ${first.label} ${first.year} – ${last.label} ${last.year}`;
  if (!have) return section(`Physchem and Micro KPI YTD ${year}`, sub, 'chart', C.teal, notice('Upload the Physchem KPI Reporting workbook to draw this chart.'));
  const t = kpi.targets || { phys: 0.68, micro: 0.73 };
  const mtd = months.some((m) => m.physMtd || m.microMtd);
  return section(`Physchem and Micro KPI YTD ${year}`, sub, 'chart', C.teal,
    `<div style="text-align:center;border:1px solid ${C.line};border-radius:12px;padding:8px 4px 4px;">${kpiLineChart(months, t)}</div>
    <div style="font-size:10.5px;color:${C.muted};margin-top:8px;line-height:1.5;">Physchem = monthly Plant Index; Micro = monthly Micro KPI plant index.${mtd ? ' * Hollow marker = month to date (the month is not finalised yet).' : ''}</div>`);
}

function metricCell(r, k, specK, dp = 2) {
  const v = r[k], spec = r[specK];
  const bad = outside(v, spec);
  return td(`padding:6px 6px;text-align:center;border-top:1px solid ${C.line};${bad ? `background:${C.orangeT};` : ''}`,
    `<div style="font-size:12.5px;font-weight:${bad ? 700 : 600};color:#000;">${v == null ? '<span style="color:#B1AE9F;">–</span>' : v.toFixed(dp)}</div><div style="font-size:9.5px;color:${C.muted};">${esc(rangeTxt(spec))}</div>`);
}

function runSection(ctx) {
  const { rc, rcError, date } = ctx;
  const title = 'Physchem Run Charts – Trends';
  const sub = `BBT results and forced fermentation collected ${shortDate(date)}`;
  if (!rc) {
    const msg = rcError === 'not_shared'
      ? 'The Google Sheet could not be read. Check that it is shared as “Anyone with the link can view”, or upload a copy using <b>Upload data</b>.'
      : rcError ? 'Run chart data could not be loaded just now. Use <b>Refresh</b>, or upload a copy using <b>Upload data</b>.' : 'Loading run chart data…';
    return section(title, sub, 'flask', C.purple, notice(msg, C.orangeT));
  }
  const v = dayView(rc, date, { history: ctx.history ?? 10 });
  if (!v.rows.length && !v.ff.length) return section(title, sub, 'flask', C.purple, notice('No BBT results or forced fermentation readings were logged on this date.'));
  let body = '';
  if (v.rows.length) {
    const k = v.kpi;
    body += tiles([
      { label: 'Total batches', value: n0(k.total), sub: 'BBT results today', color: C.sky },
      { label: 'In-spec batches', value: n0(k.ok), sub: 'Fully compliant', color: C.teal },
      { label: 'Deviations flagged', value: n0(k.dev), sub: 'Review / out of spec', color: k.dev ? C.orange : C.sky },
      { label: 'Compliance rate', value: `${n1(k.rate)}%`, sub: `Target ≥ ${k.target.toFixed(1)}%`, color: k.rate >= k.target ? C.teal : C.orange },
    ]);
    body += '<div style="height:16px;line-height:16px;font-size:0;">&nbsp;</div>';

    const skuRows = v.perSku.map((s) => `<tr>${td(`padding:7px 8px;font-size:12.5px;font-weight:700;border-top:1px solid ${C.line};`, esc(s.sku))}
      ${[s.total, s.ok, s.dev].map((x, i) => td(`text-align:center;font-size:12.5px;border-top:1px solid ${C.line};${i === 2 && x ? `background:${C.orangeT};font-weight:700;` : ''}`, n0(x))).join('')}
      ${td(`text-align:center;font-size:12.5px;border-top:1px solid ${C.line};`, `${n1(s.rate)}%`)}
      ${[s.plato, s.color, s.ph, s.bu, s.haze].map((x) => td(`text-align:center;font-size:12.5px;border-top:1px solid ${C.line};color:${x ? '#000' : C.muted};${x ? `font-weight:700;background:${C.orangeT};` : ''}`, x ? n0(x) : '0')).join('')}</tr>`).join('');
    const tot = v.perSku.reduce((a, s) => ({ plato: a.plato + s.plato, color: a.color + s.color, ph: a.ph + s.ph, bu: a.bu + s.bu, haze: a.haze + s.haze }), { plato: 0, color: 0, ph: 0, bu: 0, haze: 0 });
    const totRow = `<tr>${td(`padding:8px;font-size:12.5px;font-weight:700;background:${C.paleT};`, 'Fleet total')}
      ${[k.total, k.ok, k.dev].map((x) => td(`text-align:center;font-size:12.5px;font-weight:700;background:${C.paleT};`, n0(x))).join('')}
      ${td(`text-align:center;font-size:12.5px;font-weight:700;background:${C.paleT};`, `${n1(k.rate)}%`)}
      ${[tot.plato, tot.color, tot.ph, tot.bu, tot.haze].map((x) => td(`text-align:center;font-size:12.5px;font-weight:700;background:${C.paleT};`, n0(x))).join('')}</tr>`;
    body += `<div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:${C.purple};margin-bottom:6px;">Per-SKU quality &amp; compliance</div>` +
      tbl(`border:1px solid ${C.line};`, `<tr>${th('SKU', 'left')}${th('Batches')}${th('In spec')}${th('Deviations')}${th('Compliance')}${th('Plato')}${th('Colour')}${th('pH')}${th('BU')}${th('Haze')}</tr>${skuRows}${totRow}`) +
      `<div style="font-size:10.5px;color:${C.muted};margin:6px 0 16px;">Right-hand columns count batches outside spec for each measure.</div>`;

    const bbtRows = v.rows.map((r) => {
      const good = v.inSpec(r);
      return `<tr>${td(`padding:6px 8px;border-top:1px solid ${C.line};`, `<div style="font-size:12.5px;font-weight:700;">${esc(r.batch)}</div><div style="font-size:9.5px;color:${C.muted};">brewed ${esc(dmy(r.brewDate))}</div>`)}
        ${td(`text-align:center;font-size:12.5px;border-top:1px solid ${C.line};`, esc(r.bbt))}${td(`text-align:center;font-size:12.5px;font-weight:600;border-top:1px solid ${C.line};`, esc(r.sku))}
        ${metricCell(r, 'plato', 'platoSpec')}${metricCell(r, 'color', 'colorSpec')}${metricCell(r, 'ph', 'phSpec')}${metricCell(r, 'bu', 'buSpec')}${metricCell(r, 'haze', 'hazeSpec', 1)}
        ${td(`text-align:center;border-top:1px solid ${C.line};`, `<span style="display:inline-block;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;background:${good ? C.tealT : C.orange};color:#000;">${good ? 'In spec' : 'Out of spec'}</span>`)}</tr>`;
    }).join('');
    body += `<div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:${C.purple};margin-bottom:6px;">BBT results</div>` +
      tbl(`border:1px solid ${C.line};`, `<tr>${th('Batch', 'left')}${th('BBT')}${th('SKU')}${th('Plato °P')}${th('Colour')}${th('pH')}${th('BU')}${th('Haze')}${th('Status')}</tr>${bbtRows}`) +
      `<div style="font-size:10.5px;color:${C.muted};margin:6px 0 16px;">Spec range shown under each result; shaded = outside spec.</div>`;

    // run charts (2 per SKU, side by side)
    const histTxt = (ctx.history ?? 10) === 0 ? 'today’s batches only' : `last ${ctx.history ?? 10} batches of each SKU, today’s highlighted`;
    body += `<div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:${C.purple};margin-bottom:6px;">Run charts · ${histTxt}</div>`;
    body += v.charts.map((c) => tbl(`border:1px solid ${C.line};border-radius:12px;border-collapse:separate;margin-bottom:10px;`, `<tr>
      ${td('padding:8px 8px 6px;', runChart({ title: `Plato (°P) · ${c.sku}`, sub: c.platoSpec ? `Spec ${rangeTxt(c.platoSpec)}` : 'No spec', points: c.points, key: 'plato', spec: c.platoSpec }), 'width="50%" align="center"')}
      ${td('padding:8px 8px 6px;', runChart({ title: `pH · ${c.sku}`, sub: c.phSpec ? `Spec ${rangeTxt(c.phSpec)}` : 'No spec', points: c.points, key: 'ph', spec: c.phSpec }), 'width="50%" align="center"')}</tr>`)).join('');
  }

  if (v.ff.length) {
    const rows = v.ff.map((r) => {
      const spec = ffSpecFor(rc, r.sku);
      const bad = outside(r.gravity, spec);
      return `<tr>${td(`text-align:center;font-size:12.5px;border-top:1px solid ${C.line};padding:6px;`, esc(r.tank))}${td(`font-size:12.5px;font-weight:700;border-top:1px solid ${C.line};padding:6px 8px;`, esc(r.batch))}
        ${td(`font-size:12.5px;border-top:1px solid ${C.line};text-align:center;`, esc(r.sku))}${td(`font-size:12px;border-top:1px solid ${C.line};text-align:center;color:${C.muted};`, esc(dmy(r.start)))}
        ${td(`font-size:12.5px;border-top:1px solid ${C.line};text-align:center;${bad ? `background:${C.orangeT};font-weight:700;` : 'font-weight:600;'}`, `${r.gravity == null ? '–' : r.gravity.toFixed(2)}<div style="font-size:9.5px;font-weight:400;color:${C.muted};">${spec ? esc(rangeTxt(spec)) : 'no spec'}</div>`)}
        ${td(`font-size:12.5px;border-top:1px solid ${C.line};text-align:center;`, r.abv == null ? '–' : `${r.abv.toFixed(2)}%`)}${td(`font-size:12.5px;border-top:1px solid ${C.line};text-align:center;`, r.rdf == null ? '–' : `${r.rdf.toFixed(2)}%`)}
        ${td(`font-size:12.5px;border-top:1px solid ${C.line};text-align:center;`, r.preDH == null ? '–' : r.preDH.toFixed(2))}${td(`font-size:12.5px;border-top:1px solid ${C.line};text-align:center;`, r.eof == null ? '–' : r.eof.toFixed(2))}</tr>`;
    }).join('');
    body += `<div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:700;color:${C.purple};margin:${v.rows.length ? 6 : 0}px 0 6px;">Forced fermentation</div>` +
      tbl(`border:1px solid ${C.line};`, `<tr>${th('FV')}${th('Batch', 'left')}${th('SKU')}${th('Started')}${th('Gravity')}${th('ABV')}${th('RDF')}${th('Pre-DH')}${th('EOF')}</tr>${rows}`);
  }
  return section(title, sub, 'flask', C.purple, body);
}

function isoSection(ctx) {
  const rows = ctx.iso?.byDate?.[ctx.date] || [];
  if (!rows.length) return '';
  const body = rows.map((r) => {
    const hold = /hold/i.test(r.status);
    return `<tr>${td(`font-size:12.5px;padding:7px 8px;border-top:1px solid ${C.line};`, esc(r.po))}${td(`font-size:12.5px;font-weight:700;border-top:1px solid ${C.line};`, esc(r.batch))}
      ${td(`font-size:12px;border-top:1px solid ${C.line};`, esc(r.item))}${td(`font-size:12px;text-align:center;border-top:1px solid ${C.line};`, esc(dmy(r.packed)))}
      ${td(`font-size:12.5px;text-align:center;border-top:1px solid ${C.line};`, r.built == null ? '' : n0(r.built))}${td(`font-size:12px;text-align:center;border-top:1px solid ${C.line};`, esc(dmy(r.bestBefore)))}
      ${td(`text-align:center;border-top:1px solid ${C.line};`, `<span style="display:inline-block;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;background:${hold ? C.orange : C.tealT};color:#000;">${esc(r.status || '—')}</span>`)}</tr>
      ${r.assessment ? `<tr>${td(`padding:2px 8px 9px;font-size:11.5px;color:#3a382f;line-height:1.45;white-space:pre-line;`, `<span style="color:${C.muted};font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;">Assessment</span><br>${esc(r.assessment)}`, 'colspan="7"')}</tr>` : ''}`;
  }).join('');
  return section('Isolation Register – due for release', `${rows.length} line${rows.length === 1 ? '' : 's'} scheduled for release ${shortDate(ctx.date)}`, 'box', C.gold,
    tbl(`border:1px solid ${C.line};`, `<tr>${th('Prod. order', 'left')}${th('Batch', 'left')}${th('Item', 'left')}${th('Packed')}${th('Built')}${th('Best before')}${th('Status')}</tr>${body}`));
}

function notesBlock(notes) {
  if (!notes || (!notes.text && !notes.prepared)) return '';
  return `<tr>${td('padding:22px 28px 0;', `<div style="background:${C.paleT};border-left:5px solid ${C.gold};border-radius:10px;padding:14px 16px;">
    <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;color:#000;margin-bottom:6px;">Handover notes</div>
    ${notes.text ? `<div style="font-size:13.5px;line-height:1.55;color:#000;white-space:pre-line;">${esc(notes.text)}</div>` : ''}
    ${notes.prepared ? `<div style="font-size:11.5px;color:${C.muted};margin-top:8px;">Prepared by <b style="color:#000;">${esc(notes.prepared)}</b></div>` : ''}</div>`)}</tr>`;
}

// ---------- the report ----------
export function renderReport(ctx) {
  const { date, kpi } = ctx;
  const hasKpi = !!kpi?.daily?.[date];
  const idx = hasKpi ? dayIndex(kpi, date) : null;
  const gen = new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

  const head = `<tr>${td('padding:24px 28px 8px;', tbl('', `<tr>
    <td width="68" valign="middle" style="width:68px;">${LOGO}</td>
    ${td('padding-left:6px;', `<div style="font-size:10.5px;letter-spacing:.16em;text-transform:uppercase;color:${C.purple};font-weight:600;">Balter Brewing · Quality Lab</div>
      <div style="font-size:27px;font-weight:700;letter-spacing:-.015em;line-height:1.15;margin-top:4px;color:#000;">Daily Lab Handover</div>
      <div style="font-size:14px;color:#000;margin-top:5px;font-weight:500;">${esc(longDate(date))}</div>`)}
    <td width="110" align="right" valign="middle" style="width:110px;">${idx ? glassSvg(idx.plant, { width: 84, animate: ctx.mode !== 'email' }) : ''}</td></tr>`))}</tr>`;

  const summary = idx
    ? `<tr>${td('padding:14px 28px 0;', tiles([
        { label: 'Plant index', value: n1(idx.plant), sub: 'Brewing × Packaging', color: C.orange },
        { label: 'Brewing index', value: n1(idx.brewing), sub: 'Brewhouse to BBT', color: C.purple },
        { label: 'Packaging index', value: n1(idx.packaging), sub: 'Cans & kegs', color: C.sky },
        { label: 'Samples in spec', value: idx.sampleTot ? `${Math.round((idx.sampleOk / idx.sampleTot) * 100)}%` : '–', sub: `${n0(idx.sampleOk)} of ${n0(idx.sampleTot)} results`, color: C.teal },
      ]))}</tr>`
    : `<tr>${td('padding:14px 28px 0;', notice(kpi ? `No physico-chemical measurements are recorded for ${esc(shortDate(date))}.` : 'Upload the <b>Physchem KPI Reporting</b> workbook to build the daily index (Upload data).', C.orangeT))}</tr>`;

  const kpiSec = idx
    ? section('Daily Physico-Chemical Index', `Brewhouse → Fermentation → Cold Aging → Filtration/BBT → Packaging · collected ${esc(shortDate(date))}`, 'kettle', C.orange, physchemTable(idx)) +
      section('Out-of-spec results', 'The measurements behind today’s scores', 'alert', C.orange, failsTable(kpi, date))
    : '';

  const strip = `<tr><td style="height:6px;line-height:6px;font-size:0;">${tbl('', `<tr>${[C.teal, C.orange, C.purple, C.sky].map((c) => `<td style="height:6px;line-height:6px;font-size:0;background:${c};">&nbsp;</td>`).join('')}</tr>`)}</td></tr>`;
  const srcs = [kpi?.uploadedAt && `Physchem KPI Reporting (${kpi.fileName || 'uploaded'})`, ctx.rc && 'Physchem Run Charts – Trends (Google Sheets)', ctx.iso?.byDate?.[date]?.length && 'Balter Isolation Register'].filter(Boolean);
  const foot = `<tr>${td(`padding:26px 28px 22px;font-size:11px;color:${C.muted};line-height:1.6;`, `<div style="border-top:1px solid ${C.line};padding-top:12px;"><b style="color:#000;">Balter Brewing</b> · Daily Lab Handover · generated ${esc(gen)} (AEST)<br>Sources: ${esc(srcs.join(' · ') || 'none loaded yet')}.</div>`)}</tr>`;

  const inner = strip + head + summary + notesBlock(ctx.notes) + kpiSec + (hasKpi || kpi ? ytdSection(kpi, date) : '') + runSection(ctx) + isoSection(ctx) + foot + strip;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${W}" style="border-collapse:separate;width:100%;max-width:${W}px;background:#ffffff;border:1px solid ${C.line};border-radius:16px;${FONT}color:#000;margin:0 auto;">${inner}</table>`;
}
