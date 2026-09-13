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

export type ProviderName = 'openrouter' | 'groq' | 'anthropic';

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
     * 20/min is MEASURED, not quoted. A 25-request burst produced 19 successes
     * and 6 refusals reading `Rate limit exceeded: free-models-per-min`, with
     * `x-ratelimit-limit: 20` on the response. That is the wall.
     *
     * The daily figure is left NULL on purpose. OpenRouter documents 50/day
     * (1000 after $10 of credit has ever been bought), but ~70 successful free
     * requests in one day never tripped it — every refusal named the per-minute
     * source. Encoding an unverified 50 here would make the limiter refuse
     * requests the provider would have served, so the day window is simply not
     * enforced locally until someone observes a real per-day refusal.
     *
     * Note also that the dashboard's "Key limit: unlimited" is a SPEND cap in
     * dollars, not a request cap — `/api/v1/key` returns `limit: null` next to
     * `is_free_tier: true`. The two are unrelated and easy to confuse.
     */
    limits: { requestsPerMinute: 20, requestsPerDay: null, tokensPerMinute: null },
    caveat: '20/min is server-enforced. Daily cap documented as 50 (1000 after $10 credit) but not observed in testing.',
  },
  groq: {
    name: 'groq',
    envKey: 'GROQ_API_KEY',
    paid: false,
    // The TPM is the binding constraint here, not the RPM: 8,000 tokens/min
    // is less than one full resume analysis, so Groq is deliberately NOT a
    // candidate for the long tasks. See models.ts.
    limits: { requestsPerMinute: 30, requestsPerDay: 1000, tokensPerMinute: 8000 },
    caveat: '8,000 TPM — too small for resume analysis; used for short tasks only.',
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

const OPENAI_COMPATIBLE: Partial<Record<ProviderName, string>> = {
  openrouter: 'https://openrouter.ai/api/v1/chat/completions',
  groq: 'https://api.groq.com/openai/v1/chat/completions',
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
