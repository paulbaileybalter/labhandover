// Turns the on-screen report into paste-ready email HTML. The markup is identical to the website's;
// only the SVG graphics are swapped for PNG images (email clients don't draw SVG).
import { renderReport, shortDate } from './report.js';

let fontCss = null;
async function getFontCss() {
  if (fontCss !== null) return fontCss;
  try {
    const buf = await (await fetch('/fonts/lexend-latin-wght-normal.woff2')).arrayBuffer();
    let bin = '';
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    fontCss = `@font-face{font-family:Lexend;font-weight:100 900;src:url(data:font/woff2;base64,${btoa(bin)}) format('woff2');}`;
  } catch { fontCss = ''; }
  return fontCss;
}

async function svgToPng(svg) {
  const w = Number(svg.getAttribute('width')) || svg.viewBox.baseVal.width;
  const h = Number(svg.getAttribute('height')) || svg.viewBox.baseVal.height;
  const clone = svg.cloneNode(true);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', w); clone.setAttribute('height', h);
  if (clone.querySelector('text')) {
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = await getFontCss();
    clone.insertBefore(style, clone.firstChild);
  }
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('Could not draw a chart for the email')); img.src = url; });
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(w * scale); canvas.height = Math.round(h * scale);
  const g = canvas.getContext('2d');
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, canvas.width, canvas.height);
  g.drawImage(img, 0, 0, canvas.width, canvas.height);
  return { src: canvas.toDataURL('image/png'), w, h };
}

export async function buildEmail(ctx) {
  const box = document.createElement('div');
  box.innerHTML = renderReport({ ...ctx, mode: 'email' });
  if (document.fonts?.ready) await document.fonts.ready;
  for (const svg of [...box.querySelectorAll('svg')]) {
    const { src, w, h } = await svgToPng(svg);
    const img = document.createElement('img');
    img.src = src; img.width = w; img.height = h;
    img.alt = svg.getAttribute('aria-label') || '';
    img.setAttribute('style', `display:block;border:0;outline:none;width:${w}px;height:${h}px;max-width:100%;margin:0 auto;`);
    svg.replaceWith(img);
  }
  const table = box.firstElementChild;
  table.setAttribute('width', '760');
  const html = `<div style="background:#ffffff;margin:0;padding:8px 0;font-family:'Lexend','Segoe UI',Arial,sans-serif;">${box.innerHTML}</div>`;
  const d = new Date(`${ctx.date}T00:00:00Z`);
  const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()];
  return { html, subject: `${ctx.view === 'weekly' ? 'Weekly Physchem' : 'Lab Handover'} – ${wd} ${shortDate(ctx.date)}` };
}

export async function copyHtml(html, previewEl) {
  try {
    if (navigator.clipboard?.write && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([previewEl?.innerText || 'Daily Lab Handover'], { type: 'text/plain' }),
      })]);
      return true;
    }
  } catch { /* fall through to selection copy */ }
  if (!previewEl) return false;
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(previewEl);
  sel.removeAllRanges(); sel.addRange(range);
  const ok = document.execCommand('copy');
  sel.removeAllRanges();
  return ok;
}

export function downloadHtml(html, subject) {
  const doc = `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject.replace(/</g, '&lt;')}</title></head><body style="margin:0;background:#ffffff;">${html}</body></html>`;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([doc], { type: 'text/html' }));
  a.download = `${subject.replace(/[^\w\- ]+/g, '').replace(/\s+/g, '_')}.html`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
