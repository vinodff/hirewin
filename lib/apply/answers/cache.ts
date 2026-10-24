/**
 * Local answer cache: the same question gets the same answer next time.
 *
 * Kept as a JSON file on the owner's PC (answerCachePath()) so it can be read
 * or wiped by hand. What goes in is deliberately narrow:
 *
 *   - Only AI answers with confidence >= 60. Profile answers are recomputed
 *     every time from the profile itself; caching them would resurrect a value
 *     the user has since deleted or changed (an old expected CTC).
 *   - Never sensitive or null answers — those are decisions for a person.
 *   - Never free text that mentions this job's company or title, and never
 *     textareas: "Why do you want to join us?" answered for one company must
 *     not be pasted into another company's form.
 *   - Every entry records a fingerprint of the profile it was derived from.
 *     Edit the profile and the old AI answers stop being served.
 *
 * Choice answers are stored as option LABELS, not values: values are per-form
 * DOM ids ("opt_17") while labels are what the question actually meant. On
 * reuse the label is re-mapped onto the current form's value, and a label that
 * no longer exists is a miss, not a best guess.
 *
 * Several browser tabs share one file, so a save re-reads the file and merges
 * before writing, and the write goes to a temp file renamed into place — a
 * crash mid-write leaves the old cache intact rather than a truncated one.
 */
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import type { Answer, ApplicantProfile, FormQuestion, JobContext } from '@/lib/apply/types';
import { cleanText, containsWord, isChoiceQuestion, normalizeText } from './option-match';

export const CACHE_MIN_CONFIDENCE = 60;
const MAX_ENTRIES = 2000;

interface CacheEntry {
  question: string;
  /** Option labels for choice questions. */
  choice: string[] | null;
  /** Answer text for free-text questions. */
  text: string | null;
  confidence: number;
  reason: string;
  profileHash: string;
  savedAt: number;
}

interface CacheFile {
  version: 1;
  entries: Record<string, CacheEntry>;
}

/** Normalized question label plus normalized, sorted option labels. */
export function cacheKey(q: FormQuestion): string {
  const options = q.options.map((o) => normalizeText(o.label)).sort();
  return `${normalizeText(q.label)}::${options.join('|')}`;
}

/** Stable fingerprint of the profile; key order does not matter. */
export function profileFingerprint(profile: ApplicantProfile): string {
  const stable = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stable);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.keys(value as Record<string, unknown>)
          .sort()
          .map((k) => [k, stable((value as Record<string, unknown>)[k])]),
      );
    }
    return value;
  };
  return crypto.createHash('sha256').update(JSON.stringify(stable(profile))).digest('hex').slice(0, 16);
}

async function readEntries(filePath: string): Promise<Record<string, CacheEntry>> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw err;
  }
  try {
    const parsed = JSON.parse(raw) as Partial<CacheFile>;
    return parsed && parsed.version === 1 && parsed.entries && typeof parsed.entries === 'object'
      ? parsed.entries
      : {};
  } catch {
    // A corrupt cache is only lost convenience; the next save replaces it.
    return {};
  }
}

const RETRYABLE = new Set(['EPERM', 'EBUSY', 'EACCES']);

async function writeAtomic(filePath: string, data: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  await fs.writeFile(tmp, data, 'utf8');
  // Windows refuses a rename while another process (antivirus, a second tab's
  // reader) briefly holds the target; a short retry clears that.
  for (let attempt = 0; ; attempt++) {
    try {
      await fs.rename(tmp, filePath);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code ?? '';
      if (attempt < 3 && RETRYABLE.has(code)) {
        await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
        continue;
      }
      await fs.unlink(tmp).catch(() => undefined);
      throw err;
    }
  }
}

/** Serialises saves to one file within this process. */
const writeQueues = new Map<string, Promise<void>>();

function mentionsJob(text: string, job: JobContext): boolean {
  return [job.company, job.title].some((s) => typeof s === 'string' && s.trim().length >= 2 && containsWord(text, s));
}

export class AnswerCache {
  private entries: Record<string, CacheEntry> = {};
  private readonly pending = new Map<string, CacheEntry>();

  constructor(private readonly filePath: string) {}

  async load(): Promise<void> {
    this.entries = await readEntries(this.filePath);
  }

  /** The cached answer re-mapped onto this form, or null. */
  lookup(q: FormQuestion, profileHash: string): Answer | null {
    const entry = this.pending.get(cacheKey(q)) ?? this.entries[cacheKey(q)];
    if (!entry || entry.profileHash !== profileHash) return null;

    let value: string | string[];
    if (entry.choice) {
      if (!isChoiceQuestion(q)) return null;
      if (!q.multiple && entry.choice.length !== 1) return null;
      const values: string[] = [];
      for (const label of entry.choice) {
        const option = q.options.find((o) => normalizeText(o.label) === normalizeText(label));
        if (!option) return null; // the option is gone: drop the hit
        values.push(option.value);
      }
      value = q.multiple ? values : values[0];
    } else {
      if (entry.text === null || isChoiceQuestion(q)) return null;
      if (q.maxLength !== undefined && entry.text.length > q.maxLength) return null;
      if (q.kind === 'number' && !/^\d+(\.\d+)?$/.test(entry.text)) return null;
      value = entry.text;
    }
    return {
      questionId: q.id,
      label: q.label,
      value,
      source: 'cache',
      confidence: entry.confidence,
      reason: `Same question answered earlier: ${entry.reason}`,
    };
  }

  /** Queue an answer for saving when it is cacheable. Returns whether it was queued. */
  remember(q: FormQuestion, answer: Answer, profileHash: string, job: JobContext): boolean {
    if (answer.source !== 'ai' || answer.value === null || answer.sensitive) return false;
    if (!(answer.confidence >= CACHE_MIN_CONFIDENCE)) return false;
    if (q.kind === 'file' || q.kind === 'textarea') return false;

    let choice: string[] | null = null;
    let text: string | null = null;
    if (isChoiceQuestion(q)) {
      const values = Array.isArray(answer.value) ? answer.value : [answer.value];
      const labels = values.map((v) => q.options.find((o) => o.value === v)?.label);
      if (labels.length === 0 || labels.some((l) => l === undefined)) return false;
      choice = labels as string[];
    } else {
      if (typeof answer.value !== 'string' || mentionsJob(answer.value, job)) return false;
      text = answer.value;
    }

    this.pending.set(cacheKey(q), {
      question: cleanText(q.label),
      choice,
      text,
      confidence: answer.confidence,
      reason: answer.reason,
      profileHash,
      savedAt: Date.now(),
    });
    return true;
  }

  /** Merge queued entries into the file on disk. No-op when nothing is queued. */
  async save(): Promise<void> {
    if (this.pending.size === 0) return;
    const batch = new Map(this.pending);
    this.pending.clear();

    const previous = writeQueues.get(this.filePath) ?? Promise.resolve();
    const run = previous
      .catch(() => undefined)
      .then(async () => {
        const merged = { ...(await readEntries(this.filePath)), ...Object.fromEntries(batch) };
        const kept = Object.entries(merged)
          .sort(([, a], [, b]) => b.savedAt - a.savedAt)
          .slice(0, MAX_ENTRIES);
        const file: CacheFile = { version: 1, entries: Object.fromEntries(kept) };
        await writeAtomic(this.filePath, `${JSON.stringify(file, null, 2)}\n`);
        this.entries = file.entries;
      });
    writeQueues.set(this.filePath, run);
    await run;
  }
}
