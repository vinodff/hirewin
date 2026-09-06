# The Opportunities Agent

Fills `/opportunities` automatically on an admin-set schedule, and retires
listings that have closed. Ported from BVCITS 2.0, extended with a direct ATS
harvest and an admin console.

## What runs, and when

**The schedule is set in the admin console, not in code.** Open
`/admin/opportunities` and click the hours you want.

`vercel.json` registers 24 entries — one per hour — which is *permission* to run
at any hour. `opportunity_settings.run_hours_ist` decides which of those hours
does work; the other 22 invocations read that row, find themselves unscheduled,
and return in milliseconds.

That indirection exists because Vercel's Hobby plan fires a given cron entry at
most once per day, so "run 4 times daily" cannot be written in `vercel.json` at
all. It also means changing the schedule needs no deploy.

Hobby fires a cron anywhere inside its scheduled hour, so the gate compares
HOURS, never minutes: an entry that lands at 06:47 is still the 6 o'clock run.
The `slot` column in `opportunity_runs` splits at IST noon for the same reason.

Default: 06:00 and 18:00 IST.

Each invocation does three things, in order:

1. **ATS harvest** (`lib/opportunities/ats.ts`) — reads 29 public job-board APIs
   (Greenhouse, Lever, Ashby, SmartRecruiters). Free, no key, no cap. ~7,200
   postings per run.
2. **Grounded search** (`lib/opportunities/discover.ts`) — Gemini `googleSearch`
   for hackathons, scholarships, competitions and fellowships, which have no
   API. Optional; skipped without a key.
3. **Liveness sweep** (`lib/opportunities/refresh.ts`) — re-checks 40
   already-published rows, oldest first, and retires the dead ones.

Any stage may fail without cancelling the others. The run is recorded as
`partial` when that happens, and the sweep runs even when discovery did not —
retiring closed listings matters most on the days the discovery half is sick.

## Environment

| Variable | Required | Notes |
|---|---|---|
| `CRON_SECRET` | **Yes** | Already set for `/api/cron/monthly-reset`. The route **fails closed** without it. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** | Already set. All writes are service-role. |
| `NEXT_PUBLIC_SUPABASE_URL` / `_ANON_KEY` | **Yes** | Already set. The public feed reads through the anon key so RLS stays load-bearing. |
| `GEMINI_API_KEY` | No | Enables stage 2 only. Without it jobs and internships still flow; hackathons and scholarships do not. |

## The admin console

`/admin/opportunities`, gated by `requireAdmin()` (the `ADMIN_EMAILS` list).
Auto-refreshes every 15 seconds.

**Today, at a glance** — fetched, published, held for review, auto-retired, and
removed by an admin. The last two are counted separately on purpose: a dead link
the sweep retired is the agent working; a row a human removed is the agent being
overruled, and summing them would hide both.

**Schedule** — 24 hour chips. Click to add or remove a run. Also: how many links
to re-check per run, a publish cap per run, an auto-publish switch, and Pause.

**Run history** — every run with its counts, duration, trigger (cron or manual)
and status. `partial` means some stages worked and some did not.

**Row lists** — four views: Live on site, Needs review, Not direct links,
Removed. Each row can be opened, re-checked on demand, published (if held), or
removed. Every action revalidates `/opportunities`, so the public page updates
immediately rather than at the next hourly revalidation.

**Run now** — triggers a run immediately, ignoring both the schedule and Pause,
recorded under the `manual` trigger so it is never confused with a scheduled one.

## Direct application links

Every other check asks whether a posting is real. This one asks whether the link
goes to *the posting*. A careers homepage passes the trust registry (it is the
employer's own domain), passes liveness (it returns 200 forever), and then
renders an "Apply now" button that drops the reader on a search box.

`lib/opportunities/apply-link.ts` requires the URL to carry an identifier for one
posting — a numeric id, a UUID, a requisition number, a descriptive slug, or an
id-bearing query parameter like `?gh_jid=`. A URL without one is **held at
`pending`, never published**, and appears in the console's "Not direct links"
view with the reason in words.

Held rather than rejected on purpose: a listing-page URL is usually a real
opportunity extracted with a lazy link, so dropping it would lose genuine finds.

## Admin removals are permanent

Removing a row sets `retired_at` **and** `retired_by`. The nightly harvest
un-retires rows it sees alive again, but only where `retired_by IS NULL` — that
is, only ones the sweep retired. Without that condition, pressing Remove on a
posting still live on the employer's board would be undone twelve hours later.

## Setup

```bash
# 1. Apply the schema (013 = the agent, 014 = admin control)
supabase db push          # or paste both files from supabase/migrations/

# 2. See what the pipeline would publish, without writing anything
npm run opportunities:dry-run

# 3. Confirm every ATS board still resolves
npm run ats:check

# 4. Trigger a real run
curl -H "Authorization: Bearer $CRON_SECRET" https://<host>/api/cron/opportunities
```

`?force=1` re-runs a slot that already ran today.

## The feed is two halves

The Google Sheet was **not** retired. `lib/opportunities/feed.ts` merges it with
the agent's rows and the sheet wins every collision: a hand-entered row is a
decision, an agent row is a find. Consequences worth knowing:

- A bad agent run cannot displace curated content. The worst it does is add less.
- The India-only region gate applies to **agent rows only**. US roles you put in
  the sheet on purpose (Google STEP and friends) stay exactly as they are.
- If Supabase is unreachable the page falls back to the sheet, and if the sheet
  is unreachable it falls back to the committed snapshot. Both were verified
  during the build.

## Why an ATS harvest, not just search

BVCITS discovered everything by asking a model to search, then read each page
back. That path is capped at 30 model extractions per run and can paraphrase.
ATS APIs return the employer's own live requisitions as structured JSON — free,
uncapped, and impossible to hallucinate. The search channel is kept only for
what genuinely has no API.

Measured on a live run: **7,233 postings from 29 boards in 8.1 seconds**, zero
model calls.

## What gets published

The verifier is biased toward rejecting. From a live 7,233-posting harvest:

| Verdict | Count | |
|---|---|---|
| rejected | 6,405 | 4,573 not student-level · 1,820 outside India · 12 credential-harvesting |
| pending | 734 | held for review — unrecognised domain or no stated location |
| **verified** | **94** | reaches the page |

That ratio is the design working, not a bug. A reader who misses one real
opportunity loses one opportunity; a reader who trusts a fake posting loses
money.

Rejected rows from the ATS channel are counted but **not stored**
(`dropRejected`). Storing them buys nothing — the next run gets the whole board
back in one request regardless. The search channel still stores its rejections,
because re-finding a page there costs a search call and a fetch.

## Maintenance

Run `npm run ats:check` periodically. A company migrating ATS turns its registry
entry into a silent 404, and the harvest gets quietly smaller rather than
failing loudly. The script exits non-zero when any board is dead.

`npm run opportunities:dry-run` after any change to the registry, the trust list
(`sources.ts`), or the verifier — it answers the only question that matters:
would a reader see something worth clicking?
