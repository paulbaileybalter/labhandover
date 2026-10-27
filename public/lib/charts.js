// Hand-built SVG so the same graphics show on the site AND convert cleanly to PNG for the email.
export const C = {
  teal: '#47D7AC', orange: '#FDAA63', purple: '#7566A0', sky: '#99D6EA', ink: '#000000', pale: '#F1EB9C', gold: '#FFD637',
  line: '#E7E5DE', muted: '#6B685D', wash: '#FAFAF7',
  tealT: '#E3F8F1', orangeT: '#FFEBD8', purpleT: '#ECE9F3', skyT: '#E6F5FA', paleT: '#FBF9DC',
};
const FONT = "font-family=\"Lexend,'Segoe UI',Arial,sans-serif\"";
export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const f = (n, d = 1) => (n == null || !Number.isFinite(n) ? '' : n.toFixed(d));

let uid = 0;
const nextId = (p) => `${p}${++uid}`;

/** The pint glass from the previous build, filled to `pct` (0-100). */
export function glassSvg(pct, { width = 96, animate = true } = {}) {
  const id = nextId('gl');
  const p = Math.max(0, Math.min(100, pct || 0));
  const h = (p / 100) * 142;
  const y = 158 - h;
  const foam = p > 6;
  const bubbles = animate && p > 15
    ? [[36, 140, 2.6, 3.6, 0], [58, 150, 1.8, 4.4, -1.2], [76, 135, 3, 3.9, -2.1], [48, 145, 1.5, 5, -0.6], [68, 152, 2.2, 4.1, -3]]
        .map(([x, yy, r, d, dl]) => `<circle class="bub" cx="${x}" cy="${yy - (158 - y > 30 ? 0 : 0)}" r="${r}" fill="#fff" opacity=".8" style="animation-duration:${d}s;animation-delay:${dl}s"/>`).join('')
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 172" width="${width}" height="${Math.round((width * 172) / 120)}" role="img" aria-label="Pint glass filled to ${Math.round(p)} percent">
<defs><clipPath id="${id}c"><path d="M16 16H104L94.5 154Q94 158 90 158H30Q26 158 25.5 154Z"/></clipPath>
<linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD637"/><stop offset="1" stop-color="#FDAA63"/></linearGradient></defs>
<g clip-path="url(#${id}c)"><rect x="0" y="0" width="120" height="172" fill="#FAFAF7"/>
<g transform="translate(0 ${f(y, 2)})"><rect x="0" y="0" width="120" height="172" fill="url(#${id}g)"/>
${foam ? `<path d="M0 2V-10Q8 -20 18 -11T38 -11T58 -11T78 -11T98 -11T120 -12V2Z" fill="#F1EB9C"/><path d="M0 2V-3Q10 -9 20 -3T40 -3T60 -3T80 -3T100 -3T120 -3V2Z" fill="#FFFFFF" opacity=".55"/>` : ''}
${bubbles}</g>
<g transform="translate(41,72) scale(.37)"><path fill="#000" d="M136.3,70.4l-9.4-9.4c-1.6-1.6-4.3-1.6-6,0-1.6,1.6-1.6,4.3,0,6l2.3,2.3c-9.6,13.2-25.2,21.7-42.7,21.7s-33.1-8.6-42.7-21.8l2.3-2.3c1.6-1.6,1.6-4.3,0-6-1.6-1.6-4.3-1.6-6,0l-9.4,9.4c-1.6,1.6-1.6,4.3,0,6,.8.8,1.9,1.2,3,1.2s2.2-.4,3-1.2l1.1-1.1c11.2,14.7,28.9,24.2,48.7,24.2s37.5-9.5,48.7-24.2l1.1,1.1c.8.8,1.9,1.2,3,1.2s2.2-.4,3-1.2c1.6-1.6,1.6-4.3,0-6" transform="translate(-30,-45)"/></g></g>
<path d="M12 12H108L97.6 154.6Q96.8 162 90 162H30Q23.2 162 22.4 154.6Z" fill="none" stroke="#000" stroke-width="3.5" stroke-linejoin="round"/></svg>`;
}

const ICONS = {
  kettle: '<path d="M5 10h14v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M4 10h16M9 7c0-1.6 1.6-1.6 1.6-3.2M14 7c0-1.6 1.6-1.6 1.6-3.2"/>',
  tank: '<path d="M7 4h10v11l-5 6-5-6z"/><path d="M7 9h10M12 21v1.5"/>',
  snow: '<path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 6.5l2.5-2M9.5 19.5 12 17.5l2.5 2"/>',
  filter: '<path d="M4 5h16l-6 8v6l-4-2v-4z"/>',
  can: '<path d="M7 5h10v14.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 19.5z"/><path d="M7 5c0-1.2 2.2-2 5-2s5 .8 5 2M7 9h10M7 17h10"/>',
  chart: '<path d="M4 20V5M4 20h16"/><path d="M7 15l4-4 3 2.5L19 8"/>',
  flask: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/><path d="M7.5 15h9"/>',
  box: '<path d="M3.5 8 12 4l8.5 4v8L12 20l-8.5-4z"/><path d="M3.5 8 12 12l8.5-4M12 12v8"/>',
  note: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  alert: '<path d="M12 4 3 20h18z"/><path d="M12 10v5M12 17.8v.2"/>',
};
export function iconSvg(name, { size = 22, color = '#000', stroke = 1.8 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}

/** Rolling-months line chart: Physchem & Micro with dashed targets (values are fractions 0-1). */
export function kpiLineChart(months, targets, { width = 700, height = 310 } = {}) {
  const m = { l: 46, r: 120, t: 46, b: 40 };
  const W = width - m.l - m.r, H = height - m.t - m.b;
  const vals = months.flatMap((x) => [x.phys, x.micro]).concat([targets.phys, targets.micro]).filter((v) => v != null);
  const lo = Math.max(0, Math.floor((Math.min(...vals) - 0.08) * 10) / 10);
  const hi = Math.min(1.2, Math.ceil((Math.max(...vals) + 0.08) * 10) / 10);
  const x = (i) => m.l + (months.length === 1 ? W / 2 : (i * W) / (months.length - 1));
  const y = (v) => m.t + H - ((v - lo) / (hi - lo)) * H;
  const series = [
    { key: 'phys', name: 'Physchem', color: C.teal, label: 'below' },
    { key: 'micro', name: 'Micro', color: C.purple, label: 'above' },
  ];
  let g = '';
  for (let v = lo; v <= hi + 1e-9; v += 0.1) {
    g += `<line x1="${m.l}" x2="${m.l + W}" y1="${f(y(v), 1)}" y2="${f(y(v), 1)}" stroke="${C.line}" stroke-width="1"/><text x="${m.l - 8}" y="${f(y(v) + 3.5, 1)}" text-anchor="end" font-size="10.5" fill="${C.muted}" ${FONT}>${Math.round(v * 100)}%</text>`;
  }
  const yearLabel = (mo, i) => (i === 0 || mo.label === 'Jan' ? ` '${String(mo.year).slice(2)}` : '');
  months.forEach((mo, i) => {
    g += `<text x="${f(x(i), 1)}" y="${height - 14}" text-anchor="middle" font-size="11.5" font-weight="600" fill="#000" ${FONT}>${esc(mo.label)}${mo.physMtd || mo.microMtd ? '*' : ''}<tspan font-weight="400" fill="${C.muted}">${esc(yearLabel(mo, i))}</tspan></text>`;
  });
  // targets
  const tg = [
    { v: targets.phys, color: C.teal, name: 'Physchem target' },
    { v: targets.micro, color: C.purple, name: 'Micro target' },
  ];
  for (const t of tg) {
    if (t.v == null) continue;
    g += `<line x1="${m.l}" x2="${m.l + W}" y1="${f(y(t.v), 1)}" y2="${f(y(t.v), 1)}" stroke="${t.color}" stroke-width="1.8" stroke-dasharray="6 5" opacity=".85"/>`;
  }
  // end-of-line target labels (nudge apart if close)
  const ends = tg.filter((t) => t.v != null).map((t) => ({ ...t, ly: y(t.v) }));
  if (ends.length === 2 && Math.abs(ends[0].ly - ends[1].ly) < 13) {
    const mid = (ends[0].ly + ends[1].ly) / 2;
    const [a, b] = ends[0].ly < ends[1].ly ? [ends[0], ends[1]] : [ends[1], ends[0]];
    a.ly = mid - 7; b.ly = mid + 7;
  }
  for (const t of ends) g += `<text x="${m.l + W + 8}" y="${f(t.ly + 3.5, 1)}" font-size="10.5" fill="#000" ${FONT}><tspan font-weight="600">${esc(t.name)}</tspan> ${Math.round(t.v * 100)}%</text>`;
  // lines + points
  for (const s of series) {
    const pts = months.map((mo, i) => (mo[s.key] == null ? null : { i, v: mo[s.key], mtd: s.key === 'phys' ? mo.physMtd : mo.microMtd })).filter(Boolean);
    if (pts.length > 1) g += `<polyline points="${pts.map((p) => `${f(x(p.i), 1)},${f(y(p.v), 1)}`).join(' ')}" fill="none" stroke="${s.color}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
    for (const p of pts) {
      g += `<circle cx="${f(x(p.i), 1)}" cy="${f(y(p.v), 1)}" r="5.2" fill="${p.mtd ? '#fff' : s.color}" stroke="${s.color}" stroke-width="2.6"/>`;
      const ty = s.label === 'above' ? y(p.v) - 11 : y(p.v) + 19;
      g += `<text x="${f(x(p.i), 1)}" y="${f(ty, 1)}" text-anchor="middle" font-size="11" font-weight="700" fill="#000" ${FONT}>${Math.round(p.v * 100)}%</text>`;
    }
  }
  // legend
  let lx = m.l;
  for (const s of series) {
    g += `<line x1="${lx}" x2="${lx + 24}" y1="20" y2="20" stroke="${s.color}" stroke-width="3" stroke-linecap="round"/><circle cx="${lx + 12}" cy="20" r="4.4" fill="${s.color}"/><text x="${lx + 32}" y="24" font-size="12" font-weight="600" fill="#000" ${FONT}>${s.name}</text>`;
    lx += 104;
  }
  g += `<line x1="${lx + 6}" x2="${lx + 30}" y1="20" y2="20" stroke="${C.muted}" stroke-width="1.8" stroke-dasharray="6 5"/><text x="${lx + 38}" y="24" font-size="12" fill="${C.muted}" ${FONT}>Target</text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="Physchem and Micro KPI, rolling six months">${g}</svg>`;
}

/** Small run chart: one line of batches with the spec band shaded. */
export function runChart({ title, sub, points, key, spec, width = 340, height = 176, dp = 2 }) {
  const m = { l: 38, r: 12, t: 38, b: 30 };
  const W = width - m.l - m.r, H = height - m.t - m.b;
  const pts = points.filter((p) => p[key] != null);
  const all = pts.map((p) => p[key]).concat(spec || []);
  if (!all.length) return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} 60" width="${width}" height="60"><text x="8" y="30" font-size="12" fill="${C.muted}" ${FONT}>${esc(title)}: no data</text></svg>`;
  let lo = Math.min(...all), hi = Math.max(...all);
  const pad = (hi - lo || 1) * 0.18;
  lo -= pad; hi += pad;
  const x = (i) => m.l + (pts.length === 1 ? W / 2 : (i * W) / (pts.length - 1));
  const y = (v) => m.t + H - ((v - lo) / (hi - lo)) * H;
  let g = `<text x="2" y="14" font-size="12.5" font-weight="700" fill="#000" ${FONT}>${esc(title)}</text><text x="2" y="29" font-size="10" fill="${C.muted}" ${FONT}>${esc(sub)}</text>`;
  if (spec) {
    g += `<rect x="${m.l}" y="${f(y(spec[1]), 1)}" width="${W}" height="${f(y(spec[0]) - y(spec[1]), 1)}" fill="${C.sky}" opacity=".32"/>`;
    for (const v of spec) g += `<line x1="${m.l}" x2="${m.l + W}" y1="${f(y(v), 1)}" y2="${f(y(v), 1)}" stroke="${C.sky}" stroke-width="1.4" stroke-dasharray="4 3"/><text x="${m.l - 5}" y="${f(y(v) + 3.5, 1)}" text-anchor="end" font-size="9.5" fill="${C.muted}" ${FONT}>${f(v, dp > 1 && Number.isInteger(v) ? 0 : dp)}</text>`;
  }
  if (pts.length > 1) g += `<polyline points="${pts.map((p, i) => `${f(x(i), 1)},${f(y(p[key]), 1)}`).join(' ')}" fill="none" stroke="${C.purple}" stroke-width="2" stroke-linejoin="round"/>`;
  pts.forEach((p, i) => {
    const out = spec && (p[key] < spec[0] - 1e-9 || p[key] > spec[1] + 1e-9);
    const cx = f(x(i), 1), cy = f(y(p[key]), 1);
    if (p.today) {
      g += `<circle cx="${cx}" cy="${cy}" r="7" fill="${out ? C.orange : C.teal}" stroke="#000" stroke-width="1.6"/>`;
      g += `<text x="${cx}" y="${f(y(p[key]) - 11, 1)}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#000" ${FONT}>${f(p[key], dp)}</text>`;
    } else {
      g += `<circle cx="${cx}" cy="${cy}" r="3.6" fill="${out ? C.orange : C.purple}" stroke="#fff" stroke-width="1"/>`;
    }
    const lab = pts.length > 8 && i % 2 === 1 && !p.today ? '' : String(p.batch).replace(/^BA/i, '');
    g += `<text x="${cx}" y="${height - 10}" text-anchor="middle" font-size="9" ${p.today ? 'font-weight="700"' : ''} fill="${p.today ? '#000' : C.muted}" ${FONT}>${esc(lab)}</text>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${esc(title)} ${esc(sub)}">${g}</svg>`;
}
