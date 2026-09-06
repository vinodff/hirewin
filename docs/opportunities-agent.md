# The Opportunities Agent

Fills `/opportunities` automatically, twice a day, and retires listings that
have closed. Ported from BVCITS 2.0 and extended with a direct ATS harvest.

## What runs, and when

`vercel.json` schedules two invocations of `/api/cron/opportunities`:

| Cron | UTC | IST | Slot |
|---|---|---|---|
| `30 0 * * *` | 00:30 | 06:00 | morning |
| `30 12 * * *` | 12:30 | 18:00 | evening |

Vercel's Hobby plan fires a cron anywhere inside its scheduled hour and allows
one run per day per entry — which is why these are two separate entries rather
than one `30 0,12 * * *`. The `slot` column in `opportunity_runs` is split at
IST noon, so an invocation drifting from 06:00 to 06:59 is still the morning
run.

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

## Setup

```bash
# 1. Apply the schema
supabase db push          # or paste supabase/migrations/013_opportunities_agent.sql

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
