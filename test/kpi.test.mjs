import fs from 'node:fs';
import { createRequire } from 'node:module';
import { extractKpi, extractIsolation, KPI_SHEETS } from '../public/lib/kpi-parse.js';
import { monthIndex, dayIndex, rollingMonths } from '../public/lib/kpi.js';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const dir = '/mnt/user-data/attachments/a506d7ef-6940-564e-8cac-bc9437f5598e/';

let t = Date.now();
const wb = XLSX.read(fs.readFileSync(dir + 'eaef3331-Physchem_KPI_Reporting_2025.xlsx'), { type: 'buffer', sheets: KPI_SHEETS, dense: true });
console.log('read ms', Date.now() - t);
t = Date.now();
const kpi = extractKpi(XLSX, wb, 'test.xlsx');
console.log('extract ms', Date.now() - t, 'days', Object.keys(kpi.daily).length, 'json KB', Math.round(JSON.stringify(kpi).length / 1024));
console.log('history', kpi.history, kpi.targets, kpi.microCurrent);

const oct = monthIndex(kpi, '2026-10');
console.log('Oct plant', oct.plant.toFixed(4), '(sheet 54.5374203) brewing', oct.brewing.toFixed(4), '(69.04248251) pack', oct.packaging.toFixed(4), '(78.99110565)');
console.log('BH', oct.stages[0].index.value.toFixed(4), '(89.22413793) Ferm', oct.stages[1].index.value.toFixed(4), '(67.34693878) Filt', oct.stages[3].index.value.toFixed(4), '(62.58861717)');
for (const ym of ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09']) {
  console.log(ym, 'computed', (monthIndex(kpi, ym).plant / 100).toFixed(3), 'sheet', kpi.history.phys[ym]);
}
const d = dayIndex(kpi, '2026-10-27');
console.log('27 Oct plant', d.plant.toFixed(2), 'samples', d.sampleOk, '/', d.sampleTot);
console.log('rolling', JSON.stringify(rollingMonths(kpi, '2026-10-27')));

const wb2 = XLSX.read(fs.readFileSync(dir + '01d45dc0-Balter_Isolation_Register.xlsx'), { type: 'buffer', dense: true });
const iso = extractIsolation(XLSX, wb2, 'iso.xlsx');
const ds = Object.keys(iso.byDate).sort();
console.log('iso dates', ds.length, ds.slice(-5), iso.byDate[ds[ds.length - 1]].length);
