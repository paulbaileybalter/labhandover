import fs from 'node:fs';
import { sheetsFromText, parseRunCharts, dayView } from '../public/lib/runcharts.js';
const txt = fs.readFileSync('/mnt/user-data/attachments/a506d7ef-6940-564e-8cac-bc9437f5598e/6c9c1f0a-Physchem_Run_Charts_-_Trends', 'utf8');
const rc = parseRunCharts(sheetsFromText(txt));
console.log('bbt rows', rc.bbt.length, 'trend skus', Object.keys(rc.trends).map((k) => k + ':' + rc.trends[k].points.length).join(' '));
console.log('ff rows', rc.ff.length, 'ffSpecs', rc.ffSpecs, 'target', rc.target);
for (const d of ['2026-10-26', '2026-10-24', '2026-10-25']) {
  const v = dayView(rc, d);
  console.log(d, v.kpi, v.perSku.map((x) => `${x.sku}:${x.total}/${x.ok}/${x.dev}`).join(' '), 'ff', v.ff.length, 'charts', v.charts.map((c) => c.sku + c.points.length).join(' '));
}
const ff = rc.ff.filter((r) => r.date === '2026-10-25'); console.log(ff);
console.log(rc.bbt[rc.bbt.length - 1]);
