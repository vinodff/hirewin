/**
 * Provider adapters.
 *
 * Wire formats:
 * - OpenAI-compatible `/chat/completions`: OpenRouter, Groq, Google Gemini, Mistral.
 * - Cloudflare Workers AI: native REST run endpoint (`/accounts/{account_id}/ai/run/{model}`).
 * - Anthropic native: kept native for prompt caching on the system prompt.
 *
 * Multi-Key Rotation:
 * Each provider supports a pool of multiple API keys (e.g. GROQ_API_KEYS, GEMINI_API_KEYS, etc.).
 * Keys are used via round-robin. If a key hits HTTP 429 (rate-limited), it is put on cooldown
 * and the provider automatically fails over to the next key in the pool immediately.
 */

import type { AiAttempt, AiRequest, AiUsage } from './types';

export type ProviderName =
  | 'openrouter'
  | 'groq'
  | 'cerebras'
  | 'google'
  | 'mistral'
  | 'cloudflare'
  | 'anthropic';

export interface ProviderSpec {
  name: ProviderName;
  envKey: string;
  multiEnvKey?: string;
  /** Free tiers are what the router prefers; paid is the last resort. */
  paid: boolean;
  /**
   * Documented request ceiling. The local limiter uses this to avoid spending
   * an attempt on a request the provider will refuse.
   */
  limits: { requestsPerMinute: number; requestsPerDay: number | null; tokensPerMinute: number | null };
  /** Human note about the catch, surfaced by the verify script. */
  caveat?: string;
}

export const PROVIDERS: Record<ProviderName, ProviderSpec> = {
  google: {
    name: 'google',
    envKey: 'GEMINI_API_KEY',
    multiEnvKey: 'GEMINI_API_KEYS',
    paid: false,
    limits: { requestsPerMinute: 45, requestsPerDay: 4500, tokensPerMinute: null },
    caveat: '~4,500 req/day across 3 keys, 1M context window, high reasoning.',
  },
  groq: {
    name: 'groq',
    envKey: 'GROQ_API_KEY',
    multiEnvKey: 'GROQ_API_KEYS',
    paid: false,
    limits: { requestsPerMinute: 150, requestsPerDay: 6000, tokensPerMinute: 30_000 },
    caveat: '30,000 TPM across 5 rotated keys. Ultra-fast sub-second latency.',
  },
  openrouter: {
    name: 'openrouter',
    envKey: 'OPENROUTER_API_KEY',
    multiEnvKey: 'OPENROUTER_API_KEYS',
    paid: false,
    limits: { requestsPerMinute: 60, requestsPerDay: 150, tokensPerMinute: null },
    caveat: '150 req/day across 3 distinct free accounts. 262K context.',
  },
  cloudflare: {
    name: 'cloudflare',
    envKey: 'CLOUDFLARE_API_KEY',
    multiEnvKey: 'CLOUDFLARE_API_KEYS',
    paid: false,
    limits: { requestsPerMinute: 60, requestsPerDay: 900, tokensPerMinute: null },
    caveat: '30,000 neurons/day across 3 distinct accounts (~900 req/day).',
  },
  cerebras: {
    name: 'cerebras',
    envKey: 'CEREBRAS_API_KEY',
    paid: true,
    limits: { requestsPerMinute: 30, requestsPerDay: null, tokensPerMinute: 30_000 },
    caveat: 'NOT FREE — inference returns 402 Payment Required.',
  },
  mistral: {
    name: 'mistral',
    envKey: 'MISTRAL_API_KEY',
    paid: false,
    limits: { requestsPerMinute: 10, requestsPerDay: 500, tokensPerMinute: null },
    caveat: 'Free-tier limits are per-model and unpublished.',
  },
  anthropic: {
    name: 'anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    paid: true,
    limits: { requestsPerMinute: 1000, requestsPerDay: null, tokensPerMinute: null },
  },
};

// --- Multi-Key Pool Management ---

export interface CloudflareAccountKey {
  accountId: string;
  key: string;
}

const keyIndices = new Map<ProviderName, number>();
const keyCooldowns = new Map<string, number>();

/** Get all configured keys for a provider (splitting comma-separated pools). */
export function getProviderKeys(provider: ProviderName): string[] {
  const spec = PROVIDERS[provider];
  if (!spec) return [];

  const multiKeyVal = spec.multiEnvKey ? process.env[spec.multiEnvKey] : undefined;
  if (multiKeyVal && multiKeyVal.trim()) {
    const list = multiKeyVal
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    if (list.length > 0) return list;
  }

  const singleKey = process.env[spec.envKey]?.trim();
  return singleKey ? [singleKey] : [];
}

/** Get Cloudflare account:key pairs. */
export function getCloudflarePairs(): CloudflareAccountKey[] {
  const envPairs = process.env.CLOUDFLARE_ACCOUNTS;
  if (envPairs && envPairs.trim()) {
    const pairs: CloudflareAccountKey[] = [];
    for (const item of envPairs.split(',')) {
      const [acc, key] = item.trim().split(':');
      if (acc && key) {
        pairs.push({ accountId: acc.trim(), key: key.trim() });
      }
    }
    if (pairs.length > 0) return pairs;
  }

  const defaultAcc = process.env.CLOUDFLARE_ACCOUNT_ID?.trim();
  const keys = getProviderKeys('cloudflare');
  if (defaultAcc && keys.length > 0) {
    return keys.map((key) => ({ accountId: defaultAcc, key }));
  }

  return [];
}

/** Check if a provider has at least one configured key. */
export function hasKey(provider: ProviderName): boolean {
  if (provider === 'cloudflare') {
    return getCloudflarePairs().length > 0;
  }
  return getProviderKeys(provider).length > 0;
}

/** Mark a specific key on cooldown when receiving HTTP 429. */
export function markKeyCooldown(key: string, retryAfterSeconds: number = 60) {
  keyCooldowns.set(key, Date.now() + Math.max(10, retryAfterSeconds) * 1000);
}

/** Get next active key for a provider using round-robin with cooldown exclusion. */
export function getNextKey(provider: ProviderName): string | null {
  const keys = getProviderKeys(provider);
  if (keys.length === 0) return null;

  const now = Date.now();
  const activeKeys = keys.filter((k) => (keyCooldowns.get(k) ?? 0) <= now);

  const candidates = activeKeys.length > 0 ? activeKeys : keys;
  const currentIdx = keyIndices.get(provider) ?? 0;
  const chosenKey = candidates[currentIdx % candidates.length];
  keyIndices.set(provider, (currentIdx + 1) % candidates.length);

  return chosenKey;
}

/** Get next active Cloudflare pair using round-robin. */
export function getNextCloudflarePair(): CloudflareAccountKey | null {
  const pairs = getCloudflarePairs();
  if (pairs.length === 0) return null;

  const now = Date.now();
  const active = pairs.filter((p) => (keyCooldowns.get(p.key) ?? 0) <= now);
  const candidates = active.length > 0 ? active : pairs;

  const currentIdx = keyIndices.get('cloudflare') ?? 0;
  const chosen = candidates[currentIdx % candidates.length];
  keyIndices.set('cloudflare', (currentIdx + 1) % candidates.length);

  return chosen;
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

/** Call OpenAI-compatible endpoint with automatic multi-key rotation on 429. */
async function callOpenAiCompatible(
  provider: ProviderName,
  model: string,
  req: AiRequest
): Promise<CallOutcome> {
  const url = OPENAI_COMPATIBLE[provider];
  if (!url) return failure(null, `${provider} has no API URL configured`);

  const keys = getProviderKeys(provider);
  if (keys.length === 0) return failure(null, `${provider} has no API key configured`);

  const messages = req.system
    ? [{ role: 'system', content: req.system }, ...req.messages]
    : req.messages;

  // Max attempts across distinct keys in the pool before giving up
  const maxAttempts = Math.min(keys.length, 3);
  let lastOutcome: CallOutcome = failure(null, 'No response');

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const key = getNextKey(provider);
    if (!key) break;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    };

    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hirewin.live';
      headers['X-Title'] = 'HireWin';
    }

    // Google Gemini and Groq thinking tokens can consume tokens; ensure enough headroom
    const tokenLimit =
      provider === 'google' || provider === 'groq' ? Math.max(req.maxTokens, 512) : req.maxTokens;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages,
          max_tokens: tokenLimit,
          temperature: req.temperature ?? 0,
          ...(req.json ? { response_format: { type: 'json_object' } } : {}),
        }),
        signal: AbortSignal.timeout(req.timeoutMs ?? 60_000),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        const retryAfter = Number(response.headers.get('retry-after'));
        const retrySec = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 60;

        if (response.status === 429) {
          markKeyCooldown(key, retrySec);
          lastOutcome = failure(429, `HTTP 429: ${body.slice(0, 200)}`, retrySec);
          // If more keys are available in the pool, continue to next key
          if (attempt < maxAttempts - 1) continue;
          return lastOutcome;
        }

        return failure(response.status, `HTTP ${response.status}: ${body.slice(0, 200)}`, null);
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string }; finish_reason?: string }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
        error?: { message?: string };
      };

      if (payload.error) return failure(response.status, payload.error.message ?? 'provider returned an error');

      const text = payload.choices?.[0]?.message?.content ?? '';
      if (!text.trim()) return failure(response.status, 'provider returned an empty completion');

      return {
        ok: true,
        text,
        usage: {
          inputTokens: payload.usage?.prompt_tokens ?? 0,
          outputTokens: payload.usage?.completion_tokens ?? 0,
          costUsd: 0,
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

  return lastOutcome;
}

/** Cloudflare Workers AI adapter with multi-account rotation. */
async function callCloudflare(model: string, req: AiRequest): Promise<CallOutcome> {
  const pair = getNextCloudflarePair();
  if (!pair) return failure(null, 'Cloudflare has no account:key pairs configured');

  const messages = req.system
    ? [{ role: 'system', content: req.system }, ...req.messages]
    : req.messages;

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${pair.accountId}/ai/run/${model}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${pair.key}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          max_tokens: req.maxTokens,
        }),
        signal: AbortSignal.timeout(req.timeoutMs ?? 60_000),
      }
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      if (response.status === 429) {
        markKeyCooldown(pair.key, 60);
      }
      return failure(response.status, `Cloudflare HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    const payload = (await response.json()) as {
      result?: {
        response?: string;
        choices?: { message?: { content?: string } }[];
      };
      errors?: { message: string }[];
    };

    if (payload.errors && payload.errors.length > 0) {
      return failure(response.status, payload.errors[0].message);
    }

    const text =
      payload.result?.response ??
      payload.result?.choices?.[0]?.message?.content ??
      '';

    if (!text.trim()) return failure(response.status, 'Cloudflare returned an empty completion');

    return {
      ok: true,
      text,
      usage: { inputTokens: 0, outputTokens: 0, costUsd: 0 },
      status: response.status,
      error: null,
      retryAfterSeconds: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return failure(null, message.includes('timeout') ? `timed out after ${req.timeoutMs ?? 60_000}ms` : message);
  }
}

/** Anthropic native wire format. */
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

/** Per-million-token pricing for Anthropic. */
const ANTHROPIC_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5': { input: 3, output: 15 },
  'claude-haiku-4-5': { input: 1, output: 5 },
};

function anthropicCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const price = ANTHROPIC_PRICING[model] ?? ANTHROPIC_PRICING['claude-sonnet-4-5'];
  return (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
}

/** Dispatch to the right wire format. */
export async function callProvider(
  provider: ProviderName,
  model: string,
  req: AiRequest
): Promise<CallOutcome> {
  if (provider === 'anthropic') return callAnthropic(model, req);
  if (provider === 'cloudflare') return callCloudflare(model, req);
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

/** Streaming outcome shape. */
export interface StreamOutcome {
  ok: boolean;
  stream: AsyncIterable<string> | null;
  status: number | null;
  error: string | null;
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Open a streaming connection to a provider.
 * Connects first and validates HTTP 200 before returning the iterator,
 * allowing instant failover if the connection or credentials fail.
 */
export async function streamProvider(
  provider: ProviderName,
  model: string,
  req: AiRequest
): Promise<StreamOutcome> {
  if (provider === 'anthropic') {
    // Anthropic native streaming
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) return { ok: false, stream: null, status: null, error: 'ANTHROPIC_API_KEY not set', usage: { inputTokens: 0, outputTokens: 0 } };

    const messages = req.messages.filter((m) => m.role !== 'system');
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
        stream: true,
        ...(req.system ? { system: [{ type: 'text', text: req.system }] } : {}),
        messages,
      }),
      signal: AbortSignal.timeout(req.timeoutMs ?? 90_000),
    });

    if (!response.ok || !response.body) {
      const errText = await response.text().catch(() => '');
      return { ok: false, stream: null, status: response.status, error: errText, usage: { inputTokens: 0, outputTokens: 0 } };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const usage = { inputTokens: 0, outputTokens: 0 };

    async function* makeIterator() {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payloadStr = line.slice(6).trim();
          if (!payloadStr || payloadStr === '[DONE]') continue;
          try {
            const data = JSON.parse(payloadStr);
            if (data.type === 'content_block_delta' && data.delta?.text) {
              yield data.delta.text;
            } else if (data.type === 'message_delta' && data.usage?.output_tokens) {
              usage.outputTokens = data.usage.output_tokens;
            } else if (data.type === 'message_start' && data.message?.usage) {
              usage.inputTokens = data.message.usage.input_tokens ?? 0;
            }
          } catch {
            // ignore partial JSON SSE chunks
          }
        }
      }
    }

    return { ok: true, stream: makeIterator(), status: 200, error: null, usage };
  }

  // OpenAI-compatible streaming (Google Gemini, Groq, OpenRouter)
  const url = OPENAI_COMPATIBLE[provider];
  if (!url) return { ok: false, stream: null, status: null, error: `No streaming URL for ${provider}`, usage: { inputTokens: 0, outputTokens: 0 } };

  const key = getNextKey(provider);
  if (!key) return { ok: false, stream: null, status: null, error: `No active key for ${provider}`, usage: { inputTokens: 0, outputTokens: 0 } };

  const messages = req.system
    ? [{ role: 'system', content: req.system }, ...req.messages]
    : req.messages;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${key}`,
  };

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hirewin.live';
    headers['X-Title'] = 'HireWin';
  }

  const tokenLimit = provider === 'google' ? Math.max(req.maxTokens, 1024) : req.maxTokens;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        max_tokens: tokenLimit,
        temperature: req.temperature ?? 0,
        stream: true,
        ...(req.json ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: AbortSignal.timeout(req.timeoutMs ?? 60_000),
    });

    if (!response.ok || !response.body) {
      const err = await response.text().catch(() => '');
      if (response.status === 429) {
        markKeyCooldown(key, 60);
      }
      return { ok: false, stream: null, status: response.status, error: err, usage: { inputTokens: 0, outputTokens: 0 } };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const usage = { inputTokens: 0, outputTokens: 0 };

    async function* makeIterator() {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payloadStr = line.slice(6).trim();
          if (!payloadStr || payloadStr === '[DONE]') continue;
          try {
            const data = JSON.parse(payloadStr);
            const delta = data.choices?.[0]?.delta?.content ?? '';
            if (delta) {
              yield delta;
            }
            if (data.usage) {
              usage.inputTokens = data.usage.prompt_tokens ?? usage.inputTokens;
              usage.outputTokens = data.usage.completion_tokens ?? usage.outputTokens;
            }
          } catch {
            // ignore partial JSON SSE chunks
          }
        }
      }
    }

    return { ok: true, stream: makeIterator(), status: 200, error: null, usage };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, stream: null, status: null, error: message, usage: { inputTokens: 0, outputTokens: 0 } };
  }
}
