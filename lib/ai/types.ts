/**
 * Shared contracts for the multi-provider AI layer.
 *
 * HireWin called Anthropic directly from eight routes. That is fine until the
 * bill matters, and then it is eight places to change. This module defines one
 * shape that every provider is adapted to, so a route asks for a TASK and the
 * router decides which model on which provider actually serves it.
 *
 * The central constraint, measured before any of this was written: free tiers
 * are rate-limited per MINUTE, not per month. OpenRouter allows 20 requests a
 * minute, Groq 30. No single free account serves a hundred concurrent users, so
 * the design goal is not "use the free model" — it is "spread across providers
 * and degrade to paid only when every free option is exhausted".
 */

export type AiRole = 'system' | 'user' | 'assistant';

export interface AiMessage {
  role: AiRole;
  content: string;
}

export interface AiRequest {
  /** System prompt. Sent separately because Anthropic treats it as its own field. */
  system?: string;
  messages: AiMessage[];
  maxTokens: number;
  /** Defaults to 0 — the same resume and JD should produce the same analysis. */
  temperature?: number;
  /**
   * Ask for a JSON object back.
   *
   * Enforced where the provider supports it (`response_format` on the
   * OpenAI-compatible ones). It also makes the router treat unparseable output
   * as a FAILURE worth failing over on, rather than returning prose that the
   * caller will choke on later.
   */
  json?: boolean;
  /** Abort budget for one attempt. The router keeps its own overall budget. */
  timeoutMs?: number;
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  /** USD. Zero for free models — which is the entire point. */
  costUsd: number;
}

/** One provider+model attempt, kept whether it succeeded or not. */
export interface AiAttempt {
  provider: string;
  model: string;
  ok: boolean;
  ms: number;
  /** HTTP status when there was one. Null for a timeout or transport failure. */
  status: number | null;
  /** Why it failed, in words. Null on success. */
  error: string | null;
  /** True when this attempt was skipped without being sent — local limiter. */
  skipped?: boolean;
}

export interface AiResult {
  text: string;
  provider: string;
  model: string;
  usage: AiUsage;
  /**
   * Every attempt, in order, including the failures that came before the
   * success. This is what makes a failover observable instead of magic: a route
   * can log that the answer came from the third candidate and why the first two
   * did not serve it.
   */
  attempts: AiAttempt[];
  /** True when the answer came from a paid provider after free ones failed. */
  usedPaidFallback: boolean;
}

/** Thrown only when EVERY candidate failed. Carries the full trail. */
export class AllProvidersFailedError extends Error {
  readonly attempts: AiAttempt[];

  constructor(task: string, attempts: AiAttempt[]) {
    const summary = attempts
      .map((a) => `${a.provider}/${a.model}: ${a.skipped ? 'skipped' : (a.error ?? 'unknown')}`)
      .join(' · ');
    super(`Every provider failed for "${task}". ${summary}`);
    this.name = 'AllProvidersFailedError';
    this.attempts = attempts;
  }
}
