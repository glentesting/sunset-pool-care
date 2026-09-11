@AGENTS.md

# Sunset Pool Care — working context

## Who you're talking to

Glen, the outside consultant on this build. He directs product and design; he is
not an engineer.

- Explain tradeoffs in plain terms. Don't assume he'll catch a subtle
  implementation problem on his own — surface it.
- If a request is a bad idea, say so first, then offer the better version. He
  would rather be told a plan is wrong than be agreed with.
- **Don't ask him to move files.** If a build needs an image or asset, tell him
  what you need and where it goes; he'll hand it over and you place it.

## The client

Sunset Pool Care — pool service company in Chandler, Arizona.

- Weekly service: $135/month
- Hours: 7:00–5:30 MST. Arizona — no DST, ever.
- Two co-owners: Brent Knoll and Brian Dziadzio. Both decide; neither outranks
  the other. Don't route a decision to one of them as if he's the tiebreaker.

## Stack

Next.js App Router (16.2.7, Turbopack) · TypeScript · Tailwind v4 · React 19.
Deployed on Vercel, auto-deploy from `github.com/glentesting/sunset-pool-care`.
Supabase for assessment storage (private `assessment-pdfs` bucket, signed URLs).

## Layout

```
app/(marketing)/          marketing pages; homepage essentially done
app/assessment/           Assessment Wizard — standalone route, no marketing
                          nav or footer, colors isolated under wiz-* tokens
app/assessment/review/    office review-and-regenerate screen (see below)
app/r/<reportId>          public report viewer (customer-facing link)
app/review                post-service star rating page, feeds the CRM
docs/fixing-a-report.md   office-facing runbook for correcting a sent report
```

## Out of scope in this repo

HubSpot and Make.com work happens in a different chat. If something here depends
on either, say what it needs — don't try to build it.

## Design

Clean hierarchy, generous whitespace, one dominant action per screen. **Light
themes only, never dark.** Avoid the cards-everywhere SaaS template look and
blocky CMS layouts.

---

# KNOWN STATE — don't "fix" these without asking

## Domain cutover to sunsetpoolcare.com is pending

The site answers on `sunset-pool-care.vercel.app` today; `sunsetpoolcare.com` is
still the old Wix site. A CRM workflow is gated on the cutover, so the current
URLs are deliberate and stay until the domain moves.

Three places carry it, and they are **not** interchangeable:

1. `lib/site-url.ts` — `FALLBACK` constant. Server-side base for minted links
   (`/r/<reportId>`). Overridden by `REPORT_BASE_URL` when set; that env var is
   the intended cutover switch, so the constant itself may not need editing.
2. `public/guides/how-to-choose-service.html` and `how-to-choose-repair.html` —
   `<link rel="canonical">`, `og:url`, `og:image`. These are shared by text and
   email, so previews break if they point at a dead host. See the boxed TODO in
   `next.config.ts`. Both files are client-authored deliverables preserved
   byte-for-byte apart from that `<head>` block — and the sunsetpoolcare.com
   strings in each file's **body** are Brian's branding copy. Don't touch those.
3. `content/site.ts` — `domain` and the `service@sunsetpoolcare.com` address.
   Display copy; already correct for the post-cutover world.

Also due at cutover: set `REPORT_BASE_URL`, and set `HEALTHCHECK_TOKEN` (see
`.env.example` for why it's deliberately unset today).

## NEXT_PUBLIC_GOOGLE_REVIEW_URL is intentionally unset

The Google button hides itself rather than breaking. Waiting on the client for
the URL. Note the trap: `.env.example` ships a **placeholder** value containing
`REPLACE_WITH_PLACE_ID`. Copying that file verbatim into `.env.local` makes the
button appear and link somewhere broken — which is worse than hidden. Leave the
key blank locally.

## /review POSTs on page load, with nothing to click

By design. The star rating arrives in the URL (`?r=1..5&c=<HubSpot contact id>`)
from the five one-click links in the follow-up email, so the click is already
recorded before the page renders. Fire-and-forget; the customer never waits on
it. A `useRef` guard stops StrictMode double-firing.

The Make.com webhook URL is hardcoded client-side in
`components/feedback/ServiceRating.tsx` — necessarily, since the POST happens in
the browser. It's a write-only endpoint.

---

# CORRECTIONS — things Glen's notes say that the code no longer does

Verified against the tree on 2026-09-10. Raise these with him before acting on
the older description.

## The AI presentation layer was REMOVED

Commit `1886303`, Aug 28 2026, "Remove the AI presentation layer." Deleted
`lib/anthropic.ts` and `lib/report-presentation.ts`; dropped the `presentation`
key from the payload schema, wizard state, submit route, and archive.

**Nothing in this codebase reads `ANTHROPIC_API_KEY`.** The two old hard rules
("it rewords, never changes a finding" / "must not sound like AI") now govern
nothing — the report renders the tech's own words verbatim, so there is no
rewording layer to constrain. Section notes, per-item notes, Overall Assessment
Notes and photo captions all reach the PDF exactly as typed.

Consequences worth remembering: the report **lost its summary paragraph**
outright (it had no non-AI source), and photo captions are now raw tech input
everywhere they appear. Archive schema went to version 2; v1 archives still
parse.

Loose end: `ANTHROPIC_API_KEY` may still be sitting in the Vercel environment.
Nothing reads it, so it's inert — but it's worth deleting.

## Edit-and-regenerate is SHIPPED, not parked

It's live and documented:

- `app/assessment/review/[reportId]` — the office review screen
- `app/api/review/unlock` and `app/api/review/save`
- Gated server-side by `REVIEW_ACCESS_CODE`. **Unset disables the screen
  entirely** — it fails closed rather than admitting everyone.
- `docs/fixing-a-report.md` — the office-facing runbook

The customer's `/r/<reportId>` link doesn't change when a report is corrected.

---

# Local environment

`.env.local` is **not** in this checkout and never was in git (`.gitignore`
ignores `.env*`). It lived only in the old OneDrive folder. Production on Vercel
is unaffected — those values are set in the Vercel dashboard.

Without it, marketing pages and the Assessment Wizard UI render fine, but
anything touching Supabase, HubSpot, Make, Google Drive, or the office review
screen will not work locally. `.env.example` documents every variable and why it
exists — read the comments there before setting anything; several of the
"missing" values are deliberate.

Health check, most useful diagnostic in the build: `GET /api/health/supabase`.

## Commands

```
npm run dev      # Turbopack dev server, port 3000
npm run build    # production build
npm run lint     # eslint (6 pre-existing no-unused-vars warnings, 0 errors)
```

`npm run lint` warnings in `lib/google-drive.ts` and `lib/hubspot.ts` are
underscore-prefixed stub parameters. Pre-existing; not a regression.
