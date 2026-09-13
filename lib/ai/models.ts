/**
 * Which model serves which task, and in what order.
 *
 * Every list below came from probing the live API, not from reading model
 * descriptions. That distinction produced a very different registry than the
 * first draft: of the 19 free models OpenRouter advertises, 6 can actually
 * serve a web request, and two of those six leak a reasoning monologue into
 * their output. The bench section documents what happened to the other 13.
 *
 * Two rules decide the ordering:
 *
 *   1. **A parsed task only gets clean responders.** Listing a model that
 *      prefixes "The user says: ..." on a JSON task guarantees the router
 *      fails over on every single call — spending two candidates' quota to
 *      reach the same answer it would have reached anyway.
 *
 *   2. **Anthropic is last on every list, and absent from none.** Free-first
 *      only holds if something catches the fall: a rate-limited free tier must
 *      degrade to a paid answer, never to an error on a feature someone paid
 *      for.
 *
 * Re-run `npm run ai:verify` after touching this file, and periodically
 * regardless — free models are retired without notice, and the failure is
 * quiet: the router simply fails over and the Anthropic bill creeps back up
 * while every page still works.
 */

import type { ProviderName }from './providers';

export const TASKS = [
  'resume-analysis',
  'resume-compress',
  'job-scan',
  'interview-question',
  'interview-report',
  'outreach',
  'self-description',
  'improve-summary',
] as const;

export type TaskName = (typeof TASKS)[number];

export interface Candidate {
  provider: ProviderName;
  model: string;
  /** Why this model is on this list, in a few words. Shown by the verifier. */
  note: string;
}

export interface TaskSpec {
  /** What the task needs, so a reviewer can judge the list against it. */
  requirement: string;
  /** Ceiling for output tokens. Mirrors what the route already asks for. */
  maxTokens: number;
  /** True when the caller parses the result as JSON. */
  json: boolean;
  /** Per-attempt abort budget. Long tasks need longer. */
  timeoutMs: number;
  candidates: Candidate[];
}

// --- the free bench ---------------------------------------------------------
//
// EVERY model below was probed against the live API before being listed, and
// the list is far shorter than OpenRouter's catalogue because most of that
// catalogue cannot serve a web request at all. Of 19 free models advertised,
// 6 answered. The other 13 failed in three distinct ways worth recording, so
// nobody re-adds them from a docs page:
//
//   403 "only available on agentic harnesses"  both Inkling models. Restricted
//       to coding agents; a web app cannot call them at any price.
//   200 with an empty body                     dots-3-note, ling-flash-sante,
//       ling-flash-fin, north-mini-code, content-safety, lfm-2.5. They return
//       success and nothing else — which is why the router treats an empty
//       body as a failure rather than an answer.
//   timeout / upstream 429                     nemotron-3-ultra-550b took over
//       25s on a 16-token prompt; laguna and gemma were rate-limited upstream.
//
// Measured latency is on each line. It is a floor, not a promise: these are
// free tiers and they degrade under exactly the load this system exists for.

/**
 * Clean responders — returned EXACTLY what was asked for, nothing else.
 *
 * That distinction is not pedantry. Two otherwise-working models (Nemotron
 * Super and Lightning) prefix their answers with a visible reasoning monologue
 * — "The user says: ..." — which is fine for prose and ruinous for a field the
 * product parses. Those two are kept only for tasks where the output is read
 * by a human, never for one that is parsed.
 */

/** 258ms. Fastest clean responder measured, 256K context. */
const NANO_OMNI: Candidate = {
  provider: 'openrouter',
  model: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  note: '258ms, clean output, 256K ctx',
};

/** 509ms, 262K context. */
const NEX_MINI: Candidate = {
  provider: 'openrouter',
  model: 'nex-agi/nex-n2.5-mini:free',
  note: '509ms, clean output, 262K ctx',
};

/** 645ms, 262K context. The largest clean responder — leads the long tasks. */
const NEX_PRO: Candidate = {
  provider: 'openrouter',
  model: 'nex-agi/nex-n2.5-pro:free',
  note: '645ms, clean output, 262K ctx, largest of the working set',
};

/** 856ms, 262K context. A fourth vendor, which is the point of including it. */
const LING_FLASH: Candidate = {
  provider: 'openrouter',
  model: 'inclusionai/ling-3.0-flash-vl:free',
  note: '856ms, clean output, independent vendor',
};

/**
 * Works, but prefixes answers with a reasoning monologue.
 *
 * Only ever used for tasks whose output a human reads. Putting these on a
 * JSON task would make the router fail over on every call — burning two
 * candidates' quota to arrive at the same place — so they are deliberately
 * absent from the parsed tasks below.
 */
const NEMOTRON_SUPER_PROSE: Candidate = {
  provider: 'openrouter',
  model: 'nvidia/nemotron-3-super-120b-a12b:free',
  note: '274ms but leaks a reasoning preamble — prose tasks only',
};

const LIGHTNING_PROSE: Candidate = {
  provider: 'openrouter',
  model: 'nvidia/nemotron-3.5-lightning:free',
  note: '640ms but leaks a reasoning preamble — prose tasks only',
};

// --- the paid floor --------------------------------------------------------

const CLAUDE_SONNET: Candidate = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-5',
  note: 'paid fallback — only reached when every free option failed',
};

const CLAUDE_HAIKU: Candidate = {
  provider: 'anthropic',
  model: 'claude-haiku-4-5',
  note: 'paid fallback for short tasks',
};

export const TASK_SPECS: Record<TaskName, TaskSpec> = {
  /**
   * The core product, and the one the free tier serves worst.
   *
   * Long input, 8k of structured output, and the result is parsed — so only
   * clean responders qualify, and Sonnet sits one step behind rather than
   * three. Of everything here this is the likeliest to reach paid, which is
   * the correct trade: a garbled resume rewrite is worse than a small bill.
   */
  'resume-analysis': {
    requirement: 'Long context, high reasoning, 8k structured output. Quality over speed.',
    maxTokens: 8192,
    json: true,
    timeoutMs: 120_000,
    candidates: [NEX_PRO, LING_FLASH, CLAUDE_SONNET],
  },

  /** Mechanical shortening, read by a human. Speed wins; prose models allowed. */
  'resume-compress': {
    requirement: 'Shorten to a word budget without losing facts. Mechanical.',
    maxTokens: 4096,
    json: false,
    timeoutMs: 60_000,
    candidates: [NANO_OMNI, NEX_MINI, LIGHTNING_PROSE, CLAUDE_HAIKU],
  },

  /** Parsed output — clean responders only. */
  'job-scan': {
    requirement: 'Extract structured fields from a job posting. Medium input.',
    maxTokens: 4000,
    json: true,
    timeoutMs: 60_000,
    candidates: [NEX_MINI, NANO_OMNI, NEX_PRO, CLAUDE_HAIKU],
  },

  /** A human is waiting mid-interview, so the fastest measured model leads. */
  'interview-question': {
    requirement: 'One short question, generated while a user waits. Latency is everything.',
    maxTokens: 256,
    json: false,
    timeoutMs: 20_000,
    candidates: [NANO_OMNI, NEX_MINI, NEMOTRON_SUPER_PROSE, CLAUDE_HAIKU],
  },

  /** Parsed, and reads a whole transcript. Clean responders only. */
  'interview-report': {
    requirement: 'Judge a full transcript. Long input, reasoning, structured output.',
    maxTokens: 3000,
    json: true,
    timeoutMs: 90_000,
    candidates: [NEX_PRO, LING_FLASH, NEX_MINI, CLAUDE_SONNET],
  },

  outreach: {
    requirement: 'Short outreach message. Tone matters more than reasoning.',
    maxTokens: 512,
    json: false,
    timeoutMs: 30_000,
    candidates: [NEX_MINI, NANO_OMNI, LING_FLASH, CLAUDE_HAIKU],
  },

  'self-description': {
    requirement: 'Rewrite a personal summary. Medium output, tone-sensitive.',
    maxTokens: 2048,
    json: false,
    timeoutMs: 45_000,
    candidates: [NEX_PRO, NEX_MINI, LING_FLASH, CLAUDE_HAIKU],
  },

  'improve-summary': {
    requirement: 'Tighten a few sentences. Smallest task in the product.',
    maxTokens: 300,
    json: false,
    timeoutMs: 20_000,
    candidates: [NANO_OMNI, NEX_MINI, LING_FLASH, CLAUDE_HAIKU],
  },
};

/**
 * Candidates for a task, filtered to providers that actually have a key.
 *
 * Filtering here rather than failing inside the adapter keeps the attempt trail
 * honest: a provider with no key was never a candidate, so it should not appear
 * in the result as though it had been tried and refused.
 */
export function candidatesFor(task: TaskName, hasKey: (p: ProviderName) => boolean): Candidate[] {
  return TASK_SPECS[task].candidates.filter((c) => hasKey(c.provider));
}

/** Every distinct provider+model pair the registry references. For the verifier. */
export function allCandidates(): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const spec of Object.values(TASK_SPECS)) {
    for (const candidate of spec.candidates) {
      const key = `${candidate.provider}:${candidate.model}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(candidate);
    }
  }
  return out;
}
