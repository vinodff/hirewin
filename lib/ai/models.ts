/**
 * Which model serves which task, and in what order.
 *
 * All models listed below are verified live against their endpoints.
 * Ordering rules:
 *   1. Best suited free model leads (e.g. Gemini 3.8 Flash for long structured reasoning, Groq for sub-second tasks).
 *   2. Providers alternate (Google -> OpenRouter -> Cloudflare -> Groq) to leverage independent rate-limit budgets.
 *   3. Anthropic is the emergency paid fallback at the end of each list.
 */

import type { ProviderName } from './providers';

export const TASKS = [
  'resume-analysis',
  'resume-compress',
  'job-scan',
  'interview-question',
  'interview-report',
  'outreach',
  'self-description',
  'improve-summary',
  'form-answer',
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

// --- Verified Free Candidates ---

/** Google Gemini 3.8 Flash — 1M context, state of the art reasoning, clean JSON */
export const GEMINI_FLASH: Candidate = {
  provider: 'google',
  model: 'gemini-3.8-flash',
  note: 'Gemini 3.8 Flash — 1M context, high reasoning, 4.5k req/day across 3 keys',
};

/** Groq Qwen 27B — 262K context, fast, clean JSON */
export const GROQ_QWEN: Candidate = {
  provider: 'groq',
  model: 'qwen/qwen3.8-27b',
  note: 'Groq Qwen 27B — clean JSON, 262k context, 30k TPM across 5 keys',
};

/** Groq 120B — 30,000 TPM across 5 keys, high quality output */
export const GROQ_120B: Candidate = {
  provider: 'groq',
  model: 'openai/gpt-oss-120b',
  note: 'Groq 120B — 30k TPM across 5 keys, high quality output',
};

/** OpenRouter Nex Pro — 262K context, tested clean output */
export const NEX_PRO: Candidate = {
  provider: 'openrouter',
  model: 'nex-agi/nex-n2.5-pro:free',
  note: 'Nex Pro — clean JSON, 262K context, 150 req/day across 3 accounts',
};

/** OpenRouter Nex Mini — fast clean JSON */
export const NEX_MINI: Candidate = {
  provider: 'openrouter',
  model: 'nex-agi/nex-n2.5-mini:free',
  note: 'Nex Mini — fast, clean JSON, 262K context',
};

/** Cloudflare Workers AI — Llama 3.1 70B */
export const CF_LLAMA_70B: Candidate = {
  provider: 'cloudflare',
  model: '@cf/meta/llama-3.1-70b-instruct',
  note: 'Cloudflare Llama 3.1 70B — 30k neurons/day across 3 accounts',
};

/** Cloudflare Workers AI — Llama 3.1 8B */
export const CF_LLAMA_8B: Candidate = {
  provider: 'cloudflare',
  model: '@cf/meta/llama-3.1-8b-instruct',
  note: 'Cloudflare Llama 3.1 8B — fast inference',
};

// --- Paid Fallback Floor ---

export const CLAUDE_SONNET: Candidate = {
  provider: 'anthropic',
  model: 'claude-sonnet-4-5',
  note: 'paid fallback — only reached when all free options fail',
};

export const CLAUDE_HAIKU: Candidate = {
  provider: 'anthropic',
  model: 'claude-haiku-4-5',
  note: 'paid fallback for short tasks',
};

export const TASK_SPECS: Record<TaskName, TaskSpec> = {
  'resume-analysis': {
    requirement: 'Long context, high reasoning, 8k structured output. Quality over speed.',
    maxTokens: 8192,
    json: true,
    timeoutMs: 120_000,
    candidates: [GEMINI_FLASH, NEX_PRO, CF_LLAMA_70B, GROQ_120B, CLAUDE_SONNET],
  },

  'resume-compress': {
    requirement: 'Shorten to a word budget without losing facts. Mechanical.',
    maxTokens: 4096,
    json: false,
    timeoutMs: 60_000,
    candidates: [GEMINI_FLASH, GROQ_QWEN, NEX_MINI, CF_LLAMA_8B, CLAUDE_HAIKU],
  },

  'job-scan': {
    requirement: 'Extract structured fields from a job posting. Medium input.',
    maxTokens: 4000,
    json: true,
    timeoutMs: 60_000,
    candidates: [GEMINI_FLASH, NEX_MINI, GROQ_QWEN, CF_LLAMA_8B, CLAUDE_HAIKU],
  },

  'interview-question': {
    requirement: 'One short question, generated while a user waits. Latency is everything.',
    maxTokens: 256,
    json: false,
    timeoutMs: 20_000,
    candidates: [GROQ_QWEN, GEMINI_FLASH, NEX_MINI, CF_LLAMA_8B, CLAUDE_HAIKU],
  },

  'interview-report': {
    requirement: 'Judge a full transcript. Long input, reasoning, structured output.',
    maxTokens: 3000,
    json: true,
    timeoutMs: 90_000,
    candidates: [GEMINI_FLASH, NEX_PRO, CF_LLAMA_70B, CLAUDE_SONNET],
  },

  outreach: {
    requirement: 'Short outreach message. Tone matters more than reasoning.',
    maxTokens: 512,
    json: false,
    timeoutMs: 30_000,
    candidates: [GROQ_QWEN, GEMINI_FLASH, NEX_MINI, CLAUDE_HAIKU],
  },

  'self-description': {
    requirement: 'Rewrite a personal summary. Medium output, tone-sensitive.',
    maxTokens: 2048,
    json: false,
    timeoutMs: 45_000,
    candidates: [GEMINI_FLASH, GROQ_120B, NEX_MINI, CLAUDE_HAIKU],
  },

  'improve-summary': {
    requirement: 'Tighten a few sentences. Smallest task in the product.',
    maxTokens: 300,
    json: false,
    timeoutMs: 20_000,
    candidates: [GROQ_QWEN, GEMINI_FLASH, NEX_MINI, CLAUDE_HAIKU],
  },

  'form-answer': {
    requirement: 'Answer a batch of form questions from a profile and resume. Medium input, structured output.',
    maxTokens: 3000,
    json: true,
    timeoutMs: 60_000,
    candidates: [GEMINI_FLASH, NEX_MINI, GROQ_QWEN, CF_LLAMA_8B, CLAUDE_HAIKU],
  },
};

/**
 * Candidates for a task, filtered to providers that actually have a key.
 */
export function candidatesFor(task: TaskName, hasKeyCheck: (p: ProviderName) => boolean): Candidate[] {
  return TASK_SPECS[task].candidates.filter((c) => hasKeyCheck(c.provider));
}

/** Every distinct provider+model pair the registry references. */
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
