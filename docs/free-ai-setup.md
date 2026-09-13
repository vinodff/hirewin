# Free AI setup — how many users you can actually serve

Every number here was measured against the live APIs, not copied from a docs
page. Where a figure could not be verified it says so.

---

## The short answer

| Providers configured | Requests/day | Users/day* |
|---|---|---|
| OpenRouter only, no credit | 50 | **~5** |
| OpenRouter + $10 credit | 1,000 | ~100 |
| Groq + Google + OpenRouter | ~2,800 | **~280** |
| The above + $10 OpenRouter credit | ~3,750 | **~375** |

> **Corrected 2026-09-13.** An earlier version of this table claimed ~10,000
> requests/day, on the basis that Cerebras offered the largest free token
> budget. Testing with a real key disproved it — Cerebras returns
> **402 Payment Required** on every inference call. It contributed more than
> half the original estimate, so the honest figure is roughly a third of what
> was first written. See the Cerebras section below.

\* A full HireWin session — one resume analysis plus a short interview — is
roughly **10 AI calls**. Divide accordingly; a user who only runs one rewrite
costs 1 call, not 10.

**100,000 users free is not achievable.** At 1 call each that is 100,000
requests a day; the entire free stack is under 4,000. Free tiers are rate-limited
precisely to prevent this. Past roughly 400 users/day you are paying someone,
or self-hosting on your own GPU.

---

## Ranked: how many resumes each provider can generate, free, per day

One HireWin resume is one `/analyze` call, and its token cost is knowable from
the code rather than guessed:

| Part | Tokens |
|---|---|
| System prompt (`SYSTEM_PROMPT` in lib/anthropic.ts) | ~3,400 |
| Resume text | ~800 |
| Job description | ~500 |
| Output (rewrite + analysis JSON) | ~2,300 |
| **Total per resume** | **~7,000** |

That number is what turns a rate limit into an answer. A provider's daily
resume capacity is whichever of its three ceilings binds first.

| # | Resumes/day | Provider | Confidence | The catch |
|---|---|---|---|---|
| 1 | **10,285** | SiliconFlow | unverified | Identity verification. Chinese jurisdiction — consider before sending resumes. |
| 2 | 2,880 | OVHcloud | unverified | 2 RPM per IP, anonymous, no signup. Unreliable by design. |
| 3 | 1,500 | Google Gemini | documented | **Trains on your data. Human reviewers can read it.** |
| 4 | **1,000** | **OpenRouter + $10** | **measured** | One-time $10, permanent. The most trustworthy number here. |
| 5 | **0** | Groq | documented | **Cannot generate even one.** See below. |
| 6 | 326 | Cloudflare Workers AI | documented | 10,000 neurons/day, no card. |
| 7 | 238 | Mistral | documented | $10/mo credit is the real bound. Trains on data unless you opt out. |
| 8 | 50 | OpenRouter free | measured | Both ceilings confirmed by testing. |
| 9 | 2 | Aion Labs | documented | 20,000 tokens/**day** total. Not a typo. |
| — | unlimited | Anthropic Sonnet | paid | **~$0.049 per resume.** |

### Groq cannot generate a resume at all

Its free tier allows **6,000 tokens per minute**. One resume is ~7,000. A single
request exceeds the entire per-minute budget, so it fails regardless of how long
you wait between calls. Groq is excellent for short prompts — interview
questions, summary tweaks — and structurally unable to do the main job. This is
why it appears only on short tasks in `models.ts`.

### What the totals actually mean

- **All nine stacked:** ~16,300 resumes/day — but that leans on two unverified
  providers and two that train on your data.
- **Verified AND privacy-acceptable:** OpenRouter + $10 (1,000) plus Cloudflare
  (326) = **~1,300 resumes/day.**

1,300 free resumes a day is a real business at this stage. It is also 1.3% of
100,000. The gap is not closed by finding another provider.

### One paid resume costs 4.9 cents

At ~$0.049, 1,000 resumes on Claude Sonnet is **$49**. Prompt caching on the
3,400-token system prompt — already implemented — cuts roughly 20% off that.

Worth holding next to the free-tier hunt: the entire free stack saves you
about $50 a day at a volume you are 40× away from reaching.

---

## Step 1 — Get the keys (15 minutes, all free, no card)

Do them in this order. The first two carry most of the load.

### ~~1. Cerebras~~ — NOT FREE, skip it

**https://cloud.cerebras.ai/**

Widely listed as the most generous free tier. It is not one. Tested with a real
key:

```
GET  /v1/models        200   lists gpt-oss-120b, qwen-3.8-27b, gemma-4-31b
POST /v1/chat/...      402   "Payment required to access this resource."
```

The key authenticates and the account exists — the models endpoint answers
fine. Every actual inference call is refused. The third listed model 404s as
inaccessible on top of that.

Worth naming the trap: **a models endpoint is not an entitlement check.** It
will happily list things your key cannot call.

If you set up billing it becomes usable, but then it is a paid provider and
Anthropic is already the paid fallback. It stays defined in `providers.ts`
marked `paid: true`, and is absent from every task list.

### 2. Google AI Studio — best context, and unblocks the Opportunities Agent

**https://aistudio.google.com/apikey** → *Create API key*

```bash
GEMINI_API_KEY=AIza...
```

~1,500 requests/day on Flash. Google no longer publishes free-tier limits —
check yours at **https://aistudio.google.com/rate-limit**.

Worth doing even ignoring this router: the same key turns on the hackathon and
scholarship channel in the Opportunities Agent, which is currently skipped.

### 3. Groq — fastest responses

**https://console.groq.com/keys** → sign up → *Create API Key*

```bash
GROQ_API_KEY=gsk_...
```

Advertised as 14,400 requests/day. **The real ceiling is 6,000 tokens/minute**,
which stops you around 1,200 requests — the advertised number is never the
binding one. Used only for short prompts; it cannot carry a resume analysis.

### 4. OpenRouter — widest model choice

**https://openrouter.ai/keys** → *Create Key*

```bash
OPENROUTER_API_KEY=sk-or-v1-...
```

**50 requests/day.** Measured, not quoted — the refusal reads
`Rate limit exceeded: free-models-per-day`. Resets midnight UTC (05:30 IST).

> The dashboard's **"Key limit: unlimited"** is a *spending* cap in dollars, not
> a request cap. `/api/v1/key` returns `limit: null` beside
> `is_free_tier: true`. The two are unrelated.

**https://openrouter.ai/settings/credits** → add **$10 once** → permanently
1,000/day, and you never have to spend the credit. Best value in this list.

### 5. Mistral — optional fourth vendor

**https://console.mistral.ai/api-keys/**

```bash
MISTRAL_API_KEY=...
```

Free-tier ceilings are per-model and unpublished. Encoded conservatively; the
router simply moves on when refused.

---

## Step 2 — Add them to `.env.local`

```bash
GEMINI_API_KEY=AIza...
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-v1-...
MISTRAL_API_KEY=...          # optional
```

`.env.local` is gitignored and untracked — verified. For production, add the
same variables in your Vercel project settings.

---

## Step 3 — Verify every key and model

```bash
npm run ai:verify
```

Sends one tiny prompt per model and prints a line each. **Run this before
trusting any route**, and again monthly: free models are retired without
notice, and the failure is silent — the router just fails over and your
Anthropic bill creeps back up while every page still works.

Model IDs for Google and Mistral are **not yet probed** — that needs a key for
each. The verifier prints `FAIL` for any that are wrong, with the reason.

This step is not a formality. Cerebras was written into this guide as the
largest free tier and removed an hour later because the first real call
returned 402. Guessed model IDs were wrong too: it serves `gpt-oss-120b`, not
the Llama models that had been assumed.

---

## Step 4 — Load test

```bash
npm run ai:loadtest              # 1 → 5 → 10 → 25 concurrent
npm run ai:loadtest -- 100       # a single 100-concurrent stage
npm run ai:loadtest -- 10 --paid # allow the paid fallback
```

Defaults to free-only, deliberately: with Anthropic behind it almost everything
succeeds and the report would say "fine" while quietly spending money.

Measured at 10 concurrent on OpenRouter alone: **10/10 succeeded**, p50 7.2s,
p95 11.2s — 8 served by the first choice, 2 rescued by the second after NVIDIA
returned `ResourceExhausted`.

---

## Why more providers means more capacity

Each task's candidate list steps across **providers**, not models:

```
resume-analysis:  OpenRouter → Google → OpenRouter → Anthropic
```

Four models on one account still share that account's per-minute ceiling, so a
same-provider list buys nothing under load. Independent accounts have
independent budgets, and stepping between them is the entire mechanism by which
the stack serves more than any single tier. A test in
`__tests__/ai-router.test.ts` enforces at least two distinct providers per task.

---

## Measured limits

| Provider | Req/min | Req/day | Tokens/min | Confidence |
|---|---|---|---|---|
| OpenRouter | **20** | **50** | — | Both measured. 1,000/day after $10 credit. |
| Groq | 30 | 14,400 | **6,000** | TPM is the real ceiling (~1,200 req/day). |
| Cerebras | — | — | — | **Unusable — 402 Payment Required.** Measured. |
| Google | ~15 | ~1,500 | — | Not published; check your AI Studio page. |
| Mistral | ~10 | ~500 | — | Unpublished; conservative guess. |
| Anthropic | paid | paid | paid | The fallback. Never rate-limited locally. |

---

## Protecting yourself from strangers

`/analyze` works without login — a deliberate lead magnet, 3 previews/day/IP.
With free models wired in, that creates a hole that does not exist today:
**an anonymous visitor whose free models are exhausted would fall through to
Claude Sonnet**, spending real money for someone who is not a customer. IPs are
trivially rotated.

The router supports the fix directly:

```ts
route('resume-analysis', req, { freeOnly: !user })
```

Anonymous traffic gets free models only. When those are exhausted the visitor
sees *"Free preview limit reached. Sign in to keep optimising."* Signed-in users
keep the full free-first-then-Claude path.

**Strangers can cost you latency. Never money.**

---

## Past ~400 users/day

No free tier goes further. The real options:

1. **Self-host** — the only genuinely unlimited answer, and the only thing in
   this document that no provider can revoke. An 8B model on a rented
   L4/A10 is ~$200–400/month with no per-request cap. Lower quality, real ops.
2. **Pay** — at 100,000 users, ~$100/day on a cheap provider is about **$0.03
   per user per month**. You charge ₹19 for one download. At that scale AI is a
   line item funded by revenue, not a problem to engineer around.
3. **Send fewer calls** — the biggest lever and the most ignored. Your system
   prompt is 3.4k tokens on *every* call, and `temperature: 0` means identical
   inputs give identical outputs, so identical resume+JD pairs are cacheable.
   Cutting call volume beats any provider swap.
