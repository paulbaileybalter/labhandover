import { renderReport, shortDate, longDate } from './lib/report.js';
import { extractKpi, extractIsolation, KPI_SHEETS } from './lib/kpi-parse.js';
import { parseRunCharts, sheetsFromWorkbook, sheetsFromText } from './lib/runcharts.js';
import { buildEmail, copyHtml, downloadHtml } from './lib/email.js';

const $ = (id) => document.getElementById(id);
const state = { date: null, kpi: null, iso: null, rc: null, rcError: '', rcAt: null, rcManual: false, notes: null, history: 10, kpiAt: null, isoAt: null };
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const addDays = (iso, n) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const brisbaneToday = () => new Date(Date.now() + 10 * 3600e3).toISOString().slice(0, 10); // AEST has no daylight saving

async function api(path, opts = {}) {
  const res = await fetch(path, { credentials: 'same-origin', ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  if (res.status === 401) { location.reload(); throw new Error('Signed out'); }
  return res;
}
const jget = async (p) => { const r = await api(p); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Request failed'); return j; };
const jput = async (p, body) => { const r = await api(p, { method: 'PUT', body: JSON.stringify(body) }); const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Upload failed'); return j; };

let toastTimer;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200); }

// ---------- rendering ----------
const ctx = () => ({ date: state.date, kpi: state.kpi, iso: state.iso, rc: state.rc, rcError: state.rcError, notes: state.notes, history: state.history, mode: 'web' });
function render() {
  if (!state.date) return;
  $('report').innerHTML = renderReport(ctx());
  $('dateInput').value = state.date;
  const chips = [];
  const at = (iso) => (iso ? new Date(iso).toLocaleString('en-AU', { timeZone: 'Australia/Brisbane', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
  chips.push(state.kpi
    ? `<span class="chip"><i></i><b>KPI data</b> to ${shortDate(state.kpi.maxDate)} · uploaded ${at(state.kpi.uploadedAt)}</span>`
    : '<span class="chip off"><i></i><b>KPI data</b> not uploaded yet</span>');
  chips.push(state.rc
    ? `<span class="chip"><i></i><b>Run charts</b> ${state.rcManual ? 'from uploaded copy' : 'live from Google Sheets'} · ${at(state.rcAt)}</span>`
    : `<span class="chip warn"><i></i><b>Run charts</b> ${state.rcError ? 'unavailable' : 'loading…'}</span>`);
  const nIso = state.iso?.byDate?.[state.date]?.length || 0;
  chips.push(nIso
    ? `<span class="chip"><i></i><b>Isolation Register</b> ${nIso} line${nIso === 1 ? '' : 's'} due for release today</span>`
    : '<span class="chip off"><i></i><b>Isolation Register</b> nothing due for release today</span>');
  $('chips').innerHTML = chips.join('');
  document.title = `Lab Handover ${shortDate(state.date)} — Balter Brewing`;
}

// ---------- data ----------
async function loadData() {
  const { kpi, iso } = await jget('/api/data');
  state.kpi = kpi; state.iso = iso;
  state.kpiAt = kpi?.uploadedAt || null; state.isoAt = iso?.uploadedAt || null;
}
async function loadRunCharts({ quiet = false } = {}) {
  if (state.rcManual) return;
  try {
    const res = await api('/api/runcharts');
    if (!res.ok) { const j = await res.json().catch(() => ({})); throw Object.assign(new Error(j.error || 'failed'), { code: j.error }); }
    const wb = XLSX.read(await res.arrayBuffer(), { type: 'array', dense: true });
    state.rc = parseRunCharts(sheetsFromWorkbook(XLSX, wb));
    state.rcError = ''; state.rcAt = new Date().toISOString();
  } catch (e) {
    if (!state.rc) { state.rcError = e.code || 'failed'; }
    if (!quiet && !state.rc) console.warn('Run charts:', e);
  }
}
async function loadNotes() {
  const { notes } = await jget(`/api/notes?date=${state.date}`);
  applyNotes(notes);
}
let lastNotesAt = null, dirty = false;
function applyNotes(notes) {
  state.notes = notes;
  lastNotesAt = notes?.updatedAt || null;
  if (!dirty) { $('prepared').value = notes?.prepared || ''; $('notesText').value = notes?.text || ''; }
  $('saved').textContent = notes?.updatedAt ? `Saved ${new Date(notes.updatedAt).toLocaleTimeString('en-AU', { timeZone: 'Australia/Brisbane', hour: 'numeric', minute: '2-digit' })}` : '';
}

let saveTimer;
function queueSave() {
  dirty = true; $('saved').textContent = 'Saving…';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const date = state.date, body = { date, prepared: $('prepared').value, text: $('notesText').value };
    try {
      const { notes } = await jput('/api/notes', body);
      if (date === state.date) { dirty = $('prepared').value !== body.prepared || $('notesText').value !== body.text; applyNotes(notes); render(); }
    } catch { $('saved').textContent = 'Could not save — will retry on next edit'; }
  }, 700);
}

async function setDate(d, { push = true } = {}) {
  state.date = d; dirty = false;
  if (push) history.replaceState(null, '', `#${d}`);
  render();
  await loadNotes().catch(() => {});
  render();
}

// ---------- polling so every open device stays in step ----------
async function poll() {
  if (document.hidden || !state.date) return;
  try {
    const m = await jget(`/api/meta?date=${state.date}`);
    let changed = false;
    if (m.kpiAt !== state.kpiAt || m.isoAt !== state.isoAt) { await loadData(); changed = true; }
    if (!dirty && (m.notes?.updatedAt || null) !== lastNotesAt) { applyNotes(m.notes); changed = true; }
    if (!state.rcManual && (!state.rc || Date.now() - new Date(state.rcAt).getTime() > 5 * 60e3)) { await loadRunCharts({ quiet: true }); changed = true; }
    if (changed) render();
  } catch { /* offline blip - try again next tick */ }
}

// ---------- uploads ----------
function addUpload(name) {
  const li = document.createElement('li'); li.className = 'busy';
  li.innerHTML = `<span class="dot"></span><div><b></b><small>Reading…</small></div>`;
  li.querySelector('b').textContent = name;
  $('uplist').prepend(li);
  return (cls, msg) => { li.className = cls; li.querySelector('small').textContent = msg; };
}

async function handleFile(file) {
  const set = addUpload(file.name);
  try {
    const buf = await file.arrayBuffer();
    const head = new Uint8Array(buf.slice(0, 2));
    if (head[0] !== 0x50 || head[1] !== 0x4b) { // not a zip -> maybe a text/CSV export of the run charts
      const text = new TextDecoder().decode(buf);
      if (!/## Sheet name:/.test(text)) throw new Error('Not an Excel workbook I recognise.');
      state.rc = parseRunCharts(sheetsFromText(text)); state.rcManual = true; state.rcError = ''; state.rcAt = new Date().toISOString();
      set('ok', 'Run chart copy loaded for this session (the live Google Sheet is used again after a refresh).');
      render();
      return;
    }
    const names = XLSX.read(buf, { type: 'array', bookSheets: true }).SheetNames;
    if (names.includes('Consolidated Measurements')) {
      set('busy', 'Reading the KPI workbook — this takes a few seconds…');
      await new Promise((r) => setTimeout(r, 30));
      const wb = XLSX.read(buf, { type: 'array', sheets: KPI_SHEETS, dense: true });
      const out = extractKpi(XLSX, wb, file.name);
      set('busy', 'Saving to the shared store…');
      const r = await jput('/api/kpi', out);
      await loadData();
      if (!state.kpi.daily[state.date]) await setDate(r.maxDate);
      set('ok', `KPI data saved · ${Object.keys(out.daily).length} days, latest ${shortDate(r.maxDate)}. All devices will pick it up.`);
    } else if (names.includes('Isolation Register')) {
      const wb = XLSX.read(buf, { type: 'array', sheets: ['Isolation Register'], dense: true });
      const out = extractIsolation(XLSX, wb, file.name);
      const r = await jput('/api/iso', out);
      await loadData();
      const n = state.iso.byDate?.[state.date]?.length || 0;
      set('ok', `Isolation Register saved · ${r.dates} release dates. ${n ? `${n} line${n === 1 ? '' : 's'} due on ${shortDate(state.date)}.` : `Nothing due on ${shortDate(state.date)}.`}`);
    } else if (names.includes('BBT Deviation Log')) {
      const wb = XLSX.read(buf, { type: 'array', dense: true });
      state.rc = parseRunCharts(sheetsFromWorkbook(XLSX, wb)); state.rcManual = true; state.rcError = ''; state.rcAt = new Date().toISOString();
      set('ok', 'Run chart copy loaded for this session (the live Google Sheet is used again after a refresh).');
    } else {
      throw new Error(`Didn’t recognise this workbook (tabs: ${names.slice(0, 4).join(', ')}…).`);
    }
    render();
  } catch (e) {
    set('err', e.message || 'Upload failed');
  }
}
const handleFiles = async (files) => { for (const f of files) await handleFile(f); };

// ---------- email ----------
let emailBuild = null;
async function openEmail() {
  $('overlay').hidden = false;
  $('emailPreview').innerHTML = '<div class="loading">Building email…</div>';
  try {
    emailBuild = await buildEmail(ctx());
    $('emailPreview').innerHTML = emailBuild.html;
    $('subject').value = emailBuild.subject;
  } catch (e) {
    $('emailPreview').innerHTML = `<div class="loading">Couldn’t build the email: ${String(e.message).replace(/</g, '&lt;')}</div>`;
  }
}

// ---------- wire up ----------
function init() {
  let h = '';
  for (let i = 0; i < 18; i++) { const s = 8 + Math.random() * 28; h += `<span style="left:${Math.random() * 100}%;width:${s}px;height:${s}px;animation-duration:${9 + Math.random() * 11}s;animation-delay:-${Math.random() * 14}s"></span>`; }
  $('bubbles').innerHTML = h;

  $('dateInput').addEventListener('change', (e) => e.target.value && setDate(e.target.value));
  $('prevDay').onclick = () => setDate(addDays(state.date, -1));
  $('nextDay').onclick = () => setDate(addDays(state.date, 1));
  $('histSel').onchange = (e) => { state.history = Number(e.target.value); render(); };
  $('refreshBtn').onclick = async (e) => {
    e.target.disabled = true;
    state.rcManual = false;
    await Promise.all([loadData(), loadRunCharts(), loadNotes()]).catch(() => {});
    render(); e.target.disabled = false; toast('Refreshed');
  };
  $('uploadBtn').onclick = () => { $('uploadPanel').open = true; $('uploadPanel').scrollIntoView({ behavior: 'smooth', block: 'center' }); };
  $('logoutBtn').onclick = async () => { await api('/api/logout', { method: 'POST' }); location.reload(); };
  $('prepared').addEventListener('input', queueSave);
  $('notesText').addEventListener('input', queueSave);

  const drop = $('drop'), input = $('fileInput');
  drop.onclick = () => input.click();
  drop.onkeydown = (e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), input.click());
  input.onchange = () => { handleFiles([...input.files]); input.value = ''; };
  ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', (e) => handleFiles([...e.dataTransfer.files]));

  $('emailBtn').onclick = openEmail;
  const close = () => { $('overlay').hidden = true; };
  $('mClose').onclick = close;
  $('overlay').addEventListener('click', (e) => e.target === $('overlay') && close());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());
  $('copyEmail').onclick = async () => {
    if (!emailBuild) return;
    toast((await copyHtml(emailBuild.html, $('emailPreview'))) ? 'Email copied — paste it into a new message' : 'Copy was blocked — use Download .html instead');
  };
  $('copySubject').onclick = async () => { try { await navigator.clipboard.writeText($('subject').value); toast('Subject copied'); } catch { $('subject').select(); document.execCommand('copy'); toast('Subject copied'); } };
  $('dlEmail').onclick = () => emailBuild && downloadHtml(emailBuild.html, emailBuild.subject);

  (async () => {
    try { await loadData(); } catch (e) { $('report').innerHTML = `<div class="loading">Couldn’t load data: ${e.message}</div>`; return; }
    const hash = location.hash.slice(1);
    const today = brisbaneToday();
    const start = /^\d{4}-\d{2}-\d{2}$/.test(hash) ? hash : state.kpi?.daily?.[today] ? today : state.kpi?.maxDate && state.kpi.maxDate < today ? state.kpi.maxDate : today;
    await setDate(start);
    loadRunCharts().then(render);
    setInterval(poll, 20000);
    document.addEventListener('visibilitychange', () => !document.hidden && poll());
  })();
}
init();
