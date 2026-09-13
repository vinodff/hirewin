/**
 * The failover engine — "if one model fails, switch to another automatically".
 *
 * Walks a task's candidate list in order, stopping at the first answer it is
 * willing to return. Four things count as a failure worth moving on from:
 *
 *   - a 429, or the local limiter predicting one
 *   - a 5xx or a transport error
 *   - a timeout
 *   - a 200 whose body is empty, or is not the JSON the caller asked for
 *
 * That last one matters more than it looks. Free models under load return 200
 * with an empty or truncated body often enough that treating HTTP status as
 * success would hand callers garbage and call it a win. A response that cannot
 * be used is a failure, whatever the status line said.
 *
 * What this deliberately does NOT do is retry the same model. A free tier that
 * just refused you will refuse you again a millisecond later, and the next
 * candidate is a different account with its own budget — moving sideways is
 * both faster and more likely to work than waiting.
 */

import {
  callProvider,
  hasKey,
  toAttempt,
  PROVIDERS,
  type ProviderName,
} from './providers';
import { reserve, penalise } from './limiter';
import { candidatesFor, TASK_SPECS, type TaskName } from './models';
import { AllProvidersFailedError, type AiAttempt, type AiRequest, type AiResult } from './types';

export interface RouteOptions {
  /**
   * Overall wall-clock budget across ALL attempts.
   *
   * Needed because the per-attempt timeout multiplied by four candidates can
   * exceed the platform's function ceiling — four 120s attempts is eight
   * minutes against a 300s limit. When the budget runs out the router stops
   * trying rather than being killed mid-attempt with nothing recorded.
   */
  budgetMs?: number;
  /** Skip the paid fallback. Used by the load harness to measure free capacity. */
  freeOnly?: boolean;
  /** Called after every attempt. For logging without coupling the router to it. */
  onAttempt?: (attempt: AiAttempt) => void;
}

/** A 200 that the caller cannot actually use is not a success. */
function usable(text: string, wantJson: boolean): { ok: boolean; reason: string | null } {
  if (!text.trim()) return { ok: false, reason: 'empty response body' };
  if (!wantJson) return { ok: true, reason: null };

  // Models wrap JSON in prose or a ```json fence often enough that failing
  // over on it would waste a perfectly good answer. Extract, then validate.
  const extracted = extractJson(text);
  if (extracted === null) return { ok: false, reason: 'asked for JSON, got unparseable output' };
  return { ok: true, reason: null };
}

/**
 * Pull a JSON object out of a response that may be fenced or prefaced.
 *
 * Returns the parsed value, or null when there is no valid JSON in it at all.
 * Exported because callers need the same leniency the router applied — it
 * would be absurd for the router to accept a fenced object and then hand the
 * caller a string it cannot parse.
 */
export function extractJson(text: string): unknown | null {
  const trimmed = text.trim();

  const direct = tryParse(trimmed);
  if (direct !== undefined) return direct;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    const parsed = tryParse(fenced[1].trim());
    if (parsed !== undefined) return parsed;
  }

  // Last resort: the outermost brace pair. Handles "Here is the result: {...}".
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) {
    const parsed = tryParse(trimmed.slice(first, last + 1));
    if (parsed !== undefined) return parsed;
  }

  return null;
}

function tryParse(value: string): unknown | undefined {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

/**
 * Run a task, failing over until something answers.
 *
 * Throws AllProvidersFailedError only when every candidate has been tried and
 * none produced a usable answer. The error carries the full attempt trail, so
 * a route can log exactly what was tried instead of "AI failed".
 */
export async function route(
  task: TaskName,
  req: Omit<AiRequest, 'maxTokens' | 'json' | 'timeoutMs'> &
    Partial<Pick<AiRequest, 'maxTokens' | 'json' | 'timeoutMs'>>,
  options: RouteOptions = {}
): Promise<AiResult> {
  const spec = TASK_SPECS[task];
  const attempts: AiAttempt[] = [];
  const startedAt = Date.now();
  const budgetMs = options.budgetMs ?? 240_000;

  let candidates = candidatesFor(task, hasKey);
  if (options.freeOnly) {
    candidates = candidates.filter((c) => !PROVIDERS[c.provider].paid);
  }

  if (candidates.length === 0) {
    throw new AllProvidersFailedError(task, [
      {
        provider: 'none',
        model: 'none',
        ok: false,
        ms: 0,
        status: null,
        error: options.freeOnly
          ? 'no free provider has an API key configured'
          : 'no provider has an API key configured — set OPENROUTER_API_KEY, GROQ_API_KEY or ANTHROPIC_API_KEY',
        skipped: true,
      },
    ]);
  }

  const request: AiRequest = {
    ...req,
    maxTokens: req.maxTokens ?? spec.maxTokens,
    json: req.json ?? spec.json,
    timeoutMs: req.timeoutMs ?? spec.timeoutMs,
  };

  for (const candidate of candidates) {
    const remaining = budgetMs - (Date.now() - startedAt);
    // Not enough clock left to be worth starting. Recorded, not silent —
    // "we ran out of time" and "everything refused us" are different stories.
    if (remaining < 2_000) {
      const attempt: AiAttempt = {
        provider: candidate.provider,
        model: candidate.model,
        ok: false,
        ms: 0,
        status: null,
        error: `skipped — only ${Math.max(0, remaining)}ms of budget left`,
        skipped: true,
      };
      attempts.push(attempt);
      options.onAttempt?.(attempt);
      continue;
    }

    const reservation = await reserve(candidate.provider);
    if (!reservation.allowed) {
      const attempt: AiAttempt = {
        provider: candidate.provider,
        model: candidate.model,
        ok: false,
        ms: 0,
        status: null,
        error: reservation.reason,
        skipped: true,
      };
      attempts.push(attempt);
      options.onAttempt?.(attempt);
      continue;
    }

    const attemptStart = Date.now();
    const outcome = await callProvider(candidate.provider, candidate.model, {
      ...request,
      // Never let one attempt eat the whole budget.
      timeoutMs: Math.min(request.timeoutMs ?? spec.timeoutMs, remaining),
    });
    const ms = Date.now() - attemptStart;

    if (outcome.ok) {
      const check = usable(outcome.text, request.json === true);
      if (check.ok) {
        const attempt = toAttempt(candidate.provider, candidate.model, outcome, ms);
        attempts.push(attempt);
        options.onAttempt?.(attempt);

        return {
          text: outcome.text,
          provider: candidate.provider,
          model: candidate.model,
          usage: outcome.usage,
          attempts,
          usedPaidFallback: PROVIDERS[candidate.provider].paid,
        };
      }

      // 200, but unusable. Recorded as the failure it is.
      const attempt: AiAttempt = {
        provider: candidate.provider,
        model: candidate.model,
        ok: false,
        ms,
        status: outcome.status,
        error: check.reason,
      };
      attempts.push(attempt);
      options.onAttempt?.(attempt);
      continue;
    }

    // A real 429 is more authoritative than our own counter — take the
    // provider out of rotation so sibling instances stop walking into it.
    if (outcome.status === 429) {
      await penalise(candidate.provider, outcome.retryAfterSeconds);
    }

    const attempt = toAttempt(candidate.provider, candidate.model, outcome, ms);
    attempts.push(attempt);
    options.onAttempt?.(attempt);
  }

  throw new AllProvidersFailedError(task, attempts);
}

/**
 * Route a task and hand back parsed JSON.
 *
 * Uses the same leniency the router validated with, so a fenced object that
 * passed the usability check parses here too.
 */
export async function routeJson<T = unknown>(
  task: TaskName,
  req: Parameters<typeof route>[1],
  options?: RouteOptions
): Promise<{ data: T; result: AiResult }> {
  const result = await route(task, { ...req, json: true }, options);
  const data = extractJson(result.text);
  if (data === null) {
    // Should be unreachable: the router refuses to return unparseable JSON.
    // Kept as a real error rather than a cast, because "should be unreachable"
    // is not the same as "is".
    throw new AllProvidersFailedError(task, [
      ...result.attempts,
      {
        provider: result.provider,
        model: result.model,
        ok: false,
        ms: 0,
        status: null,
        error: 'router returned text that failed to parse as JSON',
      },
    ]);
  }
  return { data: data as T, result };
}

/** Which providers this deployment can actually reach. For health surfaces. */
export function routerStatus(): {
  provider: ProviderName;
  configured: boolean;
  paid: boolean;
  limits: (typeof PROVIDERS)[ProviderName]['limits'];
  caveat?: string;
}[] {
  return (Object.keys(PROVIDERS) as ProviderName[]).map((name) => ({
    provider: name,
    configured: hasKey(name),
    paid: PROVIDERS[name].paid,
    limits: PROVIDERS[name].limits,
    caveat: PROVIDERS[name].caveat,
  }));
}
