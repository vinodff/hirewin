# Free AI setup — how many users you can actually serve

Every number here was measured against the live APIs, not copied from a docs
page. Where a figure could not be verified it says so.

---

## The short answer

| Providers configured | Requests/day | Users/day* |
|---|---|---|
| OpenRouter only, no credit | 50 | **~5** |
| OpenRouter + $10 credit | 1,000 | ~100 |
| All five free providers | ~9,000 | **~900** |
| All five + $10 OpenRouter credit | ~10,000 | **~1,000** |

\* A full HireWin session — one resume analysis plus a short interview — is
roughly **10 AI calls**. Divide accordingly; a user who only runs one rewrite
costs 1 call, not 10.

**100,000 users free is not achievable.** At 1 call each that is 100,000
requests a day; the entire free stack is ~10,000. Free tiers are rate-limited
precisely to prevent this. Past roughly 1,000 users/day you are paying someone,
or self-hosting on your own GPU.

---

## Step 1 — Get the keys (15 minutes, all free, no card)

Do them in this order. The first two carry most of the load.

### 1. Cerebras — biggest free token budget

**https://cloud.cerebras.ai/** → sign up → *API Keys* → create

```bash
CEREBRAS_API_KEY=csk-...
```

~30,000 tokens/minute — roughly 43M tokens/day, several times any other free
tier. This is why it leads the long tasks. Its model catalogue changes often
(it dropped from ~12 models to 2 between public audits), so re-run the verifier
periodically.

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
CEREBRAS_API_KEY=csk-...
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

Model IDs for Cerebras, Google and Mistral are **not yet probed** (that needs a
key). The verifier prints `FAIL` for any that are wrong, with the reason.

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
resume-analysis:  Cerebras → OpenRouter → Google → OpenRouter → Anthropic
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
| Cerebras | ~30 | — | **~30,000** | Documented; not yet probed. |
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

## Past ~1,000 users/day

No free tier goes further. The real options:

1. **Self-host** — the only genuinely unlimited answer. An 8B model on a rented
   L4/A10 is ~$200–400/month with no per-request cap. Lower quality, real ops.
2. **Pay** — at 100,000 users, ~$100/day on a cheap provider is about **$0.03
   per user per month**. You charge ₹19 for one download. At that scale AI is a
   line item funded by revenue, not a problem to engineer around.
3. **Send fewer calls** — the biggest lever and the most ignored. Your system
   prompt is 3.4k tokens on *every* call, and `temperature: 0` means identical
   inputs give identical outputs, so identical resume+JD pairs are cacheable.
   Cutting call volume beats any provider swap.
