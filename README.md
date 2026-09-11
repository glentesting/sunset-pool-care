# Sunset Pool Care

The Sunset Pool Care website and the field tools that run on top of it:

- **Marketing site** — services, service areas, FAQ, and a quote qualifier.
- **Assessment wizard** (`/assessment`) — what a tech fills in on a phone at the
  poolside. Four phases, ten inspection sections, photo capture, and a draft that
  survives a reload.
- **Customer report** (`/r/<reportId>`) — the rendered result, plus a PDF. The
  link is stable, so a corrected report reuses the one the customer already has.
- **Office review** (`/assessment/review/<reportId>`) — fix a sent report and
  regenerate it. See [docs/fixing-a-report.md](docs/fixing-a-report.md).
- **Post-service review** (`/review`, short alias `/r`) — star rating that sends
  happy customers to Google.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 ·
[`@react-pdf/renderer`](https://react-pdf.org/) for the PDF · Zod for validation ·
Supabase Storage for reports and photos · deployed on Vercel.

Type is Bricolage Grotesque (display) and Inter (body), loaded via `next/font`.

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

```bash
npm run build   # production build
npm run lint    # eslint
npx tsc --noEmit
```

Filling in sixteen steps by hand to test a change gets old fast: open
`/assessment?demo=1` for a "Load sample data" button that populates the whole
wizard and jumps to Review & Submit. It only appears with that query string.

`npm run lint` currently reports warnings for unused parameters in
`lib/hubspot.ts` and `lib/google-drive.ts`. Those are deliberate — both are stubs
awaiting real integrations.

## Environment

Copy `.env.example` to `.env.local` and fill it in. That file is the reference:
every variable is documented there, including which are optional and why two of
them are deliberately left unset. Names only, in brief:

| Variable | For |
| --- | --- |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Report, photo, and PDF storage |
| `CRON_SECRET` | Required in production; authorizes the daily keep-alive cron |
| `REVIEW_ACCESS_CODE` | Unlocks the office review screen |
| `MAKE_ASSESSMENT_WEBHOOK_URL` | Make.com scenario that files the HubSpot ticket |
| `HUBSPOT_PRIVATE_APP_TOKEN` | HubSpot REST API |
| `GOOGLE_SERVICE_ACCOUNT_JSON`, `GDRIVE_ASSESSMENT_FOLDER_ID` | Drive archive |
| `REPORT_BASE_URL` | Absolute base for customer links; set at domain cutover |
| `HEALTHCHECK_TOKEN` | Optional gate on `/api/health/*` — read the note first |
| `NEXT_PUBLIC_GOOGLE_REVIEW_URL` | Where the review page sends 4–5 star ratings |

With none of these set the site runs and the wizard works end to end: the
marketing pages render, and a submit still generates the full PDF — photos
embedded — and downloads it in the browser.

The submit does **not** report success, though, and this trips people up. With
no Supabase and no Make webhook there is nowhere to put the report, so
`/api/submit-assessment` returns `ok: false` and the tech-facing screen reads
"Report didn't reach the office", with the upload, save, and hand-off steps
marked skipped. That is the correct behaviour for a credential-less machine,
not a broken checkout — the PDF in your downloads folder is the real thing.
Add the Supabase pair to make the submit go green.

Two things worth knowing:

- `content/site.ts` is the single source of truth for price, phone, address, and
  service areas. Don't hardcode those anywhere else.
- `GET /api/health/supabase` is the first place to look when reports stop saving.
  The free-tier Supabase project auto-pauses after about a week of inactivity,
  which is what the daily cron in `vercel.json` exists to prevent.
