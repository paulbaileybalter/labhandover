# Balter Brewing – Daily Lab Handover

Password-protected site (Cloudflare Pages + Functions + KV). Builds the daily handover from your spreadsheets and
produces a paste-ready email that looks identical to the page.

## Deploy (Cloudflare Workers Builds from GitHub - KV is created automatically)
1. Push this folder to GitHub.
2. Cloudflare → **Workers & Pages → Create → Import a repository**. Build command: *(none)*. Deploy command: `npx wrangler deploy` (the default).
3. On first deploy Wrangler creates the KV namespace for `HANDOVER_KV` by itself (declared in `wrangler.jsonc`).
4. Worker → **Settings → Variables and Secrets → Add** (type *Secret*): `SITE_PASSWORD` (team password) and `SESSION_SECRET` (any long random string). Redeploy once after adding.
5. Google Sheet **Physchem Run Charts - Trends** must be shared as *Anyone with the link -> Viewer*.

## Daily use
- Open the site, pick the date (defaults to the latest data).
- **Upload data**: drop `Physchem KPI Reporting` (daily) and, on release days, `Balter Isolation Register`. The browser reads the
  workbook and saves only the small summary to KV, so every device sees it within ~20 s.
- Type handover notes (auto-saved, shared).
- **Email version** → *Copy email* → paste into a new message (or *Download .html*).

## Local testing
`npm install`, create `.dev.vars` (`SITE_PASSWORD=...`, `SESSION_SECRET=...`), `npm run dev`, open http://localhost:8788.
`npm run test:kpi` checks the KPI maths against the October Month tab.
