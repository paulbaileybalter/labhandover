# Balter Brewing – Daily Lab Handover

Password-protected site (Cloudflare Pages + Functions + KV). Builds the daily handover from your spreadsheets and
produces a paste-ready email that looks identical to the page.

## Deploy (GitHub Actions - KV namespace is created automatically)
1. Push this folder to a GitHub repo (branch `main`).
2. In Cloudflare create an **API token** (My Profile → API Tokens → Custom): *Account → Cloudflare Pages: Edit* and *Account → Workers KV Storage: Edit*. Note your **Account ID** (dashboard sidebar).
3. In GitHub: repo → Settings → Secrets and variables → Actions → add secrets
   `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SITE_PASSWORD` (team password), `SESSION_SECRET` (any long random string).
4. Push (or run the workflow manually). `scripts/provision.mjs` creates the KV namespace and the Pages project if missing,
   binds `HANDOVER_KV`, sets the secrets, then the workflow deploys `public/`. Site: `https://balter-lab-handover.pages.dev`.
   Change the names with `PAGES_PROJECT` / `KV_TITLE` env vars in the workflow if you like.
5. Google Sheet **Physchem Run Charts – Trends** must be shared as *Anyone with the link → Viewer*.

Use this OR Cloudflare's own Git integration, not both (the project is created for direct deploys).

## Daily use
- Open the site, pick the date (defaults to the latest data).
- **Upload data**: drop `Physchem KPI Reporting` (daily) and, on release days, `Balter Isolation Register`. The browser reads the
  workbook and saves only the small summary to KV, so every device sees it within ~20 s.
- Type handover notes (auto-saved, shared).
- **Email version** → *Copy email* → paste into a new message (or *Download .html*).

## Local testing
`npm install`, create `.dev.vars` (`SITE_PASSWORD=...`, `SESSION_SECRET=...`), `npm run dev`, open http://localhost:8788.
`npm run test:kpi` checks the KPI maths against the October Month tab.
