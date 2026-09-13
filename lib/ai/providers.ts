/**
 * Provider adapters.
 *
 * Three providers, two wire formats. OpenRouter and Groq both speak the
 * OpenAI `/chat/completions` shape, so they share one adapter and differ only
 * in base URL, key and headers. Anthropic has its own, and keeps its own
 * adapter rather than being squeezed through a compatibility shim — the shim
 * would cost prompt caching, which is what makes the paid path affordable when
 * it is reached.
 *
 * The rate limits below are MEASURED where a burst test could reach them, and
 * documented-but-unverified otherwise; each one says which it is. They feed
 * limiter.ts, so an over-strict guess there refuses requests the provider would
 * have served — which is why an unconfirmed ceiling is left null rather than
 * encoded optimistically.
 */

import type { AiAttempt, AiRequest, AiUsage } from './types';

export type ProviderName = 'openrouter' | 'groq' | 'cerebras' | 'google' | 'mistral' | 'anthropic';

export interface ProviderSpec {
  name: ProviderName;
  envKey: string;
  /** Free tiers are what the router prefers; paid is the last resort. */
  paid: boolean;
  /**
   * Documented request ceiling. The local limiter uses this to avoid spending
   * an attempt on a request the provider will refuse — a 429 costs a round
   * trip and, on a serverless platform, real wall clock.
   */
  limits: { requestsPerMinute: number; requestsPerDay: number | null; tokensPerMinute: number | null };
  /** Human note about the catch, surfaced by the verify script. */
  caveat?: string;
}

export const PROVIDERS: Record<ProviderName, ProviderSpec> = {
  openrouter: {
    name: 'openrouter',
    envKey: 'OPENROUTER_API_KEY',
    paid: false,
    /*
     * BOTH ceilings are measured, not quoted, and both are server-enforced.
     *
     *   20/min  A 25-request burst gave 19 successes and 6 refusals reading
     *           `free-models-per-min`, with `x-ratelimit-limit: 20`.
     *   50/day  Refusal reads `free-models-per-day`, `limit_source:
     *           openrouter_free_tier_daily`, `X-RateLimit-Limit: 50`, and the
     *           message "Add 10 credits to unlock 1000 free model requests per
     *           day". Resets at midnight UTC (05:30 IST).
     *
     * The daily one is the brutal one and it is easy to under-rate, because it
     * does not announce itself until it is already spent — an afternoon of
     * testing passes without a single per-day refusal, and then everything
     * stops at once. It was briefly set to null here on exactly that mistaken
     * reading. 50 a day is roughly five users of this product.
     *
     * Separately: the dashboard's "Key limit: unlimited" is a SPEND cap in
     * dollars — `/api/v1/key` returns `limit: null` beside `is_free_tier: true`.
     * It has nothing to do with request rate.
     */
    limits: { requestsPerMinute: 20, requestsPerDay: 50, tokensPerMinute: null },
    caveat: '50 requests/DAY is the binding limit — about 5 users. $10 of credit raises it to 1000/day, permanently.',
  },
  groq: {
    name: 'groq',
    envKey: 'GROQ_API_KEY',
    paid: false,
    // The TPM is the binding constraint here, not the RPM: 8,000 tokens/min
    // is less than one full resume analysis, so Groq is deliberately NOT a
    // candidate for the long tasks. See models.ts.
    // The headline is 14,400 requests/day, but 6,000 TPM stops you long before
    // that — roughly 1,200 real requests. The advertised number is never the
    // binding one on a free tier, and this is the clearest example of it.
    limits: { requestsPerMinute: 30, requestsPerDay: 14_400, tokensPerMinute: 6_000 },
    caveat: '6,000 TPM is the real ceiling (~1,200 req/day), not the advertised 14,400. Short tasks only.',
  },
  /*
   * Cerebras — REQUIRES PAYMENT. Not a free tier, whatever third-party
   * comparison articles say.
   *
   * Tested with a real key: `/v1/models` returns 200 and lists three models,
   * so the key is valid and the account exists. Every inference call is then
   * refused with 402 "Payment required to access this resource. Visit your
   * billing tab." — gpt-oss-120b and qwen-3.8-27b both, while the third listed
   * model (gemma-4-31b) 404s as inaccessible.
   *
   * Listing models a key cannot call is a trap worth naming: the models
   * endpoint is not an entitlement check. This was written in as the single
   * largest free token budget on the strength of a published comparison, and
   * the first real call disproved it.
   *
   * Marked `paid: true` so the router treats it like Anthropic — never reached
   * while a genuinely free option remains, and excluded entirely under
   * `freeOnly`. It is absent from every task list in models.ts until someone
   * confirms a working billing setup.
   */
  cerebras: {
    name: 'cerebras',
    envKey: 'CEREBRAS_API_KEY',
    paid: true,
    limits: { requestsPerMinute: 30, requestsPerDay: null, tokensPerMinute: 30_000 },
    caveat: 'NOT FREE — inference returns 402 Payment Required. Needs billing set up before it is worth anything.',
  },

  /*
   * Google AI Studio, through its OpenAI-compatible endpoint.
   *
   * Google stopped publishing free-tier limits; they are visible only inside
   * AI Studio once signed in. ~1,500 requests/day on Flash is the widely
   * reported figure, encoded conservatively because an over-generous guess
   * here makes the limiter wave through requests that will 429.
   */
  google: {
    name: 'google',
    envKey: 'GEMINI_API_KEY',
    paid: false,
    limits: { requestsPerMinute: 15, requestsPerDay: 1500, tokensPerMinute: null },
    caveat: 'Limits are not published — check aistudio.google.com/rate-limit for your account. Also unlocks the Opportunities Agent search channel.',
  },

  /*
   * Mistral. Endpoint confirmed live; the free tier's exact ceilings are
   * per-model and undocumented publicly, so the numbers below are placeholders
   * deliberately set LOW. The router simply moves on when it is refused.
   */
  mistral: {
    name: 'mistral',
    envKey: 'MISTRAL_API_KEY',
    paid: false,
    limits: { requestsPerMinute: 10, requestsPerDay: 500, tokensPerMinute: null },
    caveat: 'Free-tier limits are per-model and unpublished — these are conservative guesses.',
  },

  anthropic: {
    name: 'anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    paid: true,
    // Real limits depend on the account tier. Left unbounded because this is
    // the fallback: throttling the thing that rescues a failed request would
    // defeat its purpose.
    limits: { requestsPerMinute: 1000, requestsPerDay: null, tokensPerMinute: null },
  },
};

export function hasKey(provider: ProviderName): boolean {
  return Boolean(process.env[PROVIDERS[provider].envKey]?.trim());
}

/** Providers that are actually usable right now, free ones first. */
export function availableProviders(): ProviderSpec[] {
  return Object.values(PROVIDERS)
    .filter((p) => hasKey(p.name))
    .sort((a, b) => Number(a.paid) - Number(b.paid));
}

/*
 * Every provider here speaks the OpenAI `/chat/completions` shape, which is the
 * whole reason adding one is three lines rather than an adapter. Each URL was
 * probed: a 401 proves it is live and wants a key, where a 404 would mean the
 * path is wrong.
 */
const OPENAI_COMPATIBLE: Partial<Record<ProviderName, string>> = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
  cerebras: 'https://api.cerebras.ai/v1/chat/completions',
  google: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  mistral: 'https://api.mistral.ai/v1/chat/completions',
};

export interface CallOutcome {
  ok: boolean;
  text: string;
  usage: AiUsage;
  status: number | null;
  error: string | null;
  /** Seconds the provider asked us to wait. Only set on a 429 that says so. */
  retryAfterSeconds: number | null;
}

function failure(status: number | null, error: string, retryAfter: number | null = null): CallOutcome {
  return {
    ok: false,
    text: '',
    usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
    status,
    error,
    retryAfterSeconds: retryAfter,
  };
}

/**
 * OpenAI-shaped providers.
 *
 * Note what is NOT sent: no `stream`. Streaming is handled separately by the
 * router's stream path, because failing over mid-stream means bytes have
 * already reached the client and cannot be taken back — see router.ts.
 */
async function callOpenAiCompatible(
  provider: ProviderName,
  model: string,
  req: AiRequest
): Promise<CallOutcome> {
  const url = OPENAI_COMPATIBLE[provider];
  const key = process.env[PROVIDERS[provider].envKey];
  if (!url || !key) return failure(null, `${provider} has no API key configured`);

  const messages = req.system
    ? [{ role: 'system', content: req.system }, ...req.messages]
    : req.messages;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };
  // OpenRouter attributes traffic by these and uses them for its rankings.
  // Sending them honestly is also how a free account stays in good standing.
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hirewin.in';
    headers['X-Title'] = 'HireWin';
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        max_tokens: req.maxTokens,
        temperature: req.temperature ?? 0,
        ...(req.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: AbortSignal.timeout(req.timeoutMs ?? 60_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const retryAfter = Number(response.headers.get('retry-after'));
      return failure(
        response.status,
        `HTTP ${response.status}: ${body.slice(0, 200)}`,
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null
      );
    }

    const payload = (await response.json()) as {
      choices?: { message?: { content?: string }; finish_reason?: string }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
      error?: { message?: string };
    };

    if (payload.error) return failure(response.status, payload.error.message ?? 'provider returned an error');

    const text = payload.choices?.[0]?.message?.content ?? '';
    // A 200 with an empty body is a real failure mode on free tiers under load,
    // and one the router must fail over on rather than return as an answer.
    if (!text.trim()) return failure(response.status, 'provider returned an empty completion');

    return {
      ok: true,
      text,
      usage: {
        inputTokens: payload.usage?.prompt_tokens ?? 0,
        outputTokens: payload.usage?.completion_tokens ?? 0,
        costUsd: 0, // every model this adapter serves is a :free one
      },
      status: response.status,
      error: null,
      retryAfterSeconds: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return failure(null, message.includes('timeout') ? `timed out after ${req.timeoutMs ?? 60_000}ms` : message);
  }
}

/** Anthropic's own wire format, kept native so prompt caching survives. */
async function callAnthropic(model: string, req: AiRequest): Promise<CallOutcome> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return failure(null, 'ANTHROPIC_API_KEY is not set');

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: req.maxTokens,
        temperature: req.temperature ?? 0,
        // The system prompt is identical on every analysis call and ~3.4k
        // tokens. Caching it costs 0.1x on reads, which is most of what makes
        // the paid fallback affordable when free providers are down.
        ...(req.system
          ? { system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }] }
          : {}),
        messages: req.messages.filter((m) => m.role !== 'system'),
      }),
      signal: AbortSignal.timeout(req.timeoutMs ?? 90_000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const retryAfter = Number(response.headers.get('retry-after'));
      return failure(
        response.status,
        `HTTP ${response.status}: ${body.slice(0, 200)}`,
        Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : null
      );
    }

    const payload = (await response.json()) as {
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };

    const text = (payload.content ?? [])
      .filter((block) => block.type === 'text')
      .map((block) => block.text ?? '')
      .join('');

    if (!text.trim()) return failure(response.status, 'Anthropic returned an empty completion');

    const inputTokens = payload.usage?.input_tokens ?? 0;
    const outputTokens = payload.usage?.output_tokens ?? 0;

    return {
      ok: true,
      text,
      usage: { inputTokens, outputTokens, costUsd: anthropicCostUsd(model, inputTokens, outputTokens) },
      status: response.status,
      error: null,
      retryAfterSeconds: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return failure(null, message.includes('timeout') ? `timed out after ${req.timeoutMs ?? 90_000}ms` : message);
  }
}

/** Per-million-token pricing, mirroring the table in lib/anthropic.ts. */
const ANTHROPIC_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

function anthropicCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = ANTHROPIC_PRICING[model] ?? ANTHROPIC_PRICING['claude-sonnet-4-5'];
  return (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
}

/** Dispatch to the right wire format. The only entry point the router uses. */
export async function callProvider(
  provider: ProviderName,
  model: string,
  req: AiRequest
): Promise<CallOutcome> {
  if (provider === 'anthropic') return callAnthropic(model, req);
  return callOpenAiCompatible(provider, model, req);
}

/** Shape a CallOutcome into the attempt record the result carries. */
export function toAttempt(
  provider: ProviderName,
  model: string,
  outcome: CallOutcome,
  ms: number
): AiAttempt {
  return {
    provider,
    model,
    ok: outcome.ok,
    ms,
    status: outcome.status,
    error: outcome.error,
  };
}
