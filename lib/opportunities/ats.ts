/**
 * Direct ATS harvesting — the channel that does the heavy lifting.
 *
 * BVCITS 2.0 discovered opportunities one way: ask a model to search the web,
 * fetch what it cited, and have the model read each page back. That works, but
 * every stage is lossy and rate-limited — its own comments record a ceiling of
 * 30 model extractions per run, and Indian boards publish no JSON-LD at all so
 * they only ever arrive through the expensive path.
 *
 * Applicant tracking systems publish the same postings as structured JSON, for
 * free, with no key and no cap. Greenhouse, Lever, Ashby and SmartRecruiters
 * each expose a public board endpoint that returns the employer's live
 * requisitions with title, location, dates and description already parsed.
 *
 * That inverts the economics of the pipeline:
 *
 *   - **Exact, not inferred.** The employer typed these fields. Nothing is
 *     paraphrased and a deadline cannot be hallucinated, which matters because
 *     the deadline is the one field a reader acts on.
 *   - **Free and uncapped.** No model call, so the only budget is wall clock.
 *   - **Always current.** A closed requisition simply stops being returned,
 *     which is a far cleaner expiry signal than probing a page for tombstones.
 *
 * The grounded-search channel in discover.ts is kept for what has no API —
 * hackathons, scholarships, campus programmes — where it remains the only way
 * in. See the module header there.
 *
 * Everything here produces `OpportunityCandidate`s and nothing more. Trust,
 * scam, seniority and region decisions all still belong to verify.ts, so a
 * posting arriving through this channel is held to exactly the same bar as one
 * that arrived through search.
 */

import type { OpportunityCandidate, OpportunityKind, WorkMode } from './types';

/** Identifies the crawler honestly so a board can allow or block it on purpose. */
const USER_AGENT = 'HireWin-OpportunityBot/1.0 (+https://hirewin.in)';
const TIMEOUT_MS = 15_000;

/** Which ATS a board lives on. Each has its own endpoint and response shape. */
export type AtsVendor = 'greenhouse' | 'lever' | 'ashby' | 'smartrecruiters';

export interface AtsBoard {
  vendor: AtsVendor;
  /** The board identifier in the vendor's URL, e.g. `stripe`. */
  slug: string;
  /** Display name, used when the API does not carry one (Lever, Ashby). */
  name: string;
}

/**
 * Boards worth polling.
 *
 * Chosen for one property: they actually hire in India. A board with 400 open
 * roles that are all in Menlo Park costs a request and produces nothing once
 * region.ts has run, so it does not belong here however famous the company is.
 *
 * Verified reachable by scripts/check-ats-boards.ts — run it after editing this
 * list, because a company migrating ATS silently turns its entry into a 404 and
 * the harvest gets quietly smaller rather than failing loudly.
 */
export const ATS_BOARDS: readonly AtsBoard[] = [
  // --- Greenhouse: the largest single source of Indian product-company roles.
  // The trailing number on each line is how many postings looked Indian when
  // the registry was last probed — the reason the entry earns its request.
  { vendor: 'greenhouse', slug: 'okta', name: 'Okta' }, // 100
  { vendor: 'greenhouse', slug: 'databricks', name: 'Databricks' }, // 95
  { vendor: 'greenhouse', slug: 'mongodb', name: 'MongoDB' }, // 67
  { vendor: 'greenhouse', slug: 'gitlab', name: 'GitLab' }, // 43
  { vendor: 'greenhouse', slug: 'stripe', name: 'Stripe' }, // 40
  { vendor: 'greenhouse', slug: 'elastic', name: 'Elastic' }, // 19
  { vendor: 'greenhouse', slug: 'razorpaysoftwareprivatelimited', name: 'Razorpay' }, // 18
  { vendor: 'greenhouse', slug: 'netradyne', name: 'Netradyne' }, // 18
  { vendor: 'greenhouse', slug: 'druva', name: 'Druva' }, // 17
  { vendor: 'greenhouse', slug: 'coinbase', name: 'Coinbase' }, // 15
  { vendor: 'greenhouse', slug: 'twilio', name: 'Twilio' }, // 15
  { vendor: 'greenhouse', slug: 'airbnb', name: 'Airbnb' }, // 12
  { vendor: 'greenhouse', slug: 'datadog', name: 'Datadog' }, // 7
  { vendor: 'greenhouse', slug: 'groww', name: 'Groww' }, // 7
  { vendor: 'greenhouse', slug: 'samsara', name: 'Samsara' }, // 6
  { vendor: 'greenhouse', slug: 'postman', name: 'Postman' }, // 4
  { vendor: 'greenhouse', slug: 'doordashusa', name: 'DoorDash' }, // 4
  { vendor: 'greenhouse', slug: 'anthropic', name: 'Anthropic' }, // 3
  { vendor: 'greenhouse', slug: 'cloudflare', name: 'Cloudflare' }, // 2
  { vendor: 'greenhouse', slug: 'inmobi', name: 'InMobi' }, // 72
  { vendor: 'greenhouse', slug: 'figma', name: 'Figma' }, // 2

  // --- Lever
  { vendor: 'lever', slug: 'cred', name: 'CRED' }, // 8
  { vendor: 'lever', slug: 'meesho', name: 'Meesho' }, // 44
  { vendor: 'lever', slug: 'mindtickle', name: 'Mindtickle' }, // 18
  { vendor: 'lever', slug: 'fampay', name: 'FamPay' }, // 12
  { vendor: 'lever', slug: 'netomi', name: 'Netomi' }, // 11

  // --- Ashby
  { vendor: 'ashby', slug: 'sarvam', name: 'Sarvam AI' }, // 63
  { vendor: 'ashby', slug: 'openai', name: 'OpenAI' }, // 10
  { vendor: 'ashby', slug: 'harvey', name: 'Harvey' }, // 8
  { vendor: 'ashby', slug: 'notion', name: 'Notion' }, // 4

  // --- SmartRecruiters
  { vendor: 'smartrecruiters', slug: 'BoschGroup', name: 'Bosch' }, // 11
];

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

async function getJson(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    // A board being down is normal and must not fail the harvest. The caller
    // records a zero for this board and moves on.
    return null;
  }
}

/** Strip markup and collapse whitespace; ATS descriptions ship HTML. */
function plain(html: string | null | undefined, max = 400): string | null {
  if (!html) return null;
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
  return text ? text.slice(0, max) : null;
}

/** YYYY-MM-DD, or null when the value is missing or unparseable. */
function isoDay(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

/**
 * Internship or job?
 *
 * ATS employment-type fields are inconsistent ("Intern", "INTERN",
 * "Internship", "Temporary"), and plenty of employers leave the field at
 * "Full-time" on a role whose title says Intern. Checking both and letting
 * either win costs nothing and is right more often than trusting one.
 */
function kindOf(title: string, employmentType: string | null): OpportunityKind {
  const haystack = `${title} ${employmentType ?? ''}`;
  return /\b(intern|internship|trainee|apprentice|co-?op)\b/i.test(haystack) ? 'internship' : 'job';
}

function workModeOf(text: string | null, isRemote?: boolean): WorkMode | null {
  if (isRemote === true) return 'remote';
  if (!text) return null;
  if (/\bhybrid\b/i.test(text)) return 'hybrid';
  if (/\bremote\b|\bwork from home\b|\bwfh\b/i.test(text)) return 'remote';
  if (/\bon-?site\b|\bin[- ]office\b/i.test(text)) return 'onsite';
  return null;
}

/**
 * Published pay, when the board states one.
 *
 * Only ever lifted verbatim from the description — never computed, never
 * inferred from a job level. HireWin's card renders comp as a price tag, so a
 * wrong figure here is the most visible possible error.
 */
// Note the ordering inside the trailing alternation: longer alternatives come
// FIRST. Regex alternation is first-match, not longest-match, so `mo|month`
// matches "/month" as "/mo" and would store a per-month salary as a truncated
// string on the card. Caught by opportunity-ats.test.ts.
const PAY_PATTERN =
  /(?:[$₹£€]|Rs\.?\s*|INR\s*)\s?[\d,]+(?:\.\d+)?\s*(?:[kKmM]\b|LPA\b|lakh[s]?\b|per annum\b)?(?:\s*(?:-|–|to)\s*(?:[$₹£€]|Rs\.?\s*|INR\s*)?[\d,]+(?:\.\d+)?\s*(?:[kKmM]\b|LPA\b|lakh[s]?\b)?)?(?:\s*\/\s*(?:hour|hr|month|mo|year|yr))?/;

function compensationFrom(text: string | null): string | null {
  if (!text) return null;
  const match = text.match(PAY_PATTERN);
  if (!match) return null;
  const value = match[0].trim();
  // A bare "$5" or a stray year is noise, not a salary.
  return /\d{2,}/.test(value) ? value : null;
}

// ---------------------------------------------------------------------------
// Per-vendor readers
//
// Field names below were read off live responses, not from documentation —
// see the probe in the commit that introduced this file.
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

/** Greenhouse: `{ jobs: [{ title, absolute_url, location:{name}, ... }] }` */
function readGreenhouse(payload: unknown, board: AtsBoard): OpportunityCandidate[] {
  if (!isRecord(payload) || !Array.isArray(payload.jobs)) return [];

  return payload.jobs.flatMap((raw): OpportunityCandidate[] => {
    if (!isRecord(raw)) return [];
    const title = str(raw.title);
    const applyUrl = str(raw.absolute_url);
    if (!title || !applyUrl) return [];

    const location = isRecord(raw.location) ? str(raw.location.name) : null;
    const description = plain(str(raw.content));
    const employment = str(raw.employment);

    return [
      {
        title,
        organization: str(raw.company_name) ?? board.name,
        kind: kindOf(title, employment),
        applyUrl,
        sourceUrl: applyUrl,
        location,
        workMode: workModeOf(`${location ?? ''} ${title}`),
        eligibility: null,
        skills: [],
        description,
        // Greenhouse is one of the very few boards that publishes a real
        // deadline field. When it is null the posting genuinely has none.
        deadline: isoDay(raw.application_deadline),
        postedAt: isoDay(raw.first_published) ?? isoDay(raw.updated_at),
        compensation: compensationFrom(description),
      },
    ];
  });
}

/** Lever: a bare array of postings. */
function readLever(payload: unknown, board: AtsBoard): OpportunityCandidate[] {
  if (!Array.isArray(payload)) return [];

  return payload.flatMap((raw): OpportunityCandidate[] => {
    if (!isRecord(raw)) return [];
    const title = str(raw.text);
    const applyUrl = str(raw.hostedUrl) ?? str(raw.applyUrl);
    if (!title || !applyUrl) return [];

    const categories = isRecord(raw.categories) ? raw.categories : {};
    const location = str(categories.location);
    const commitment = str(categories.commitment);
    const description = plain(str(raw.descriptionPlain) ?? str(raw.description));

    return [
      {
        title,
        organization: board.name,
        kind: kindOf(title, commitment),
        applyUrl,
        sourceUrl: applyUrl,
        location: location ?? str(raw.country),
        workMode: workModeOf(`${location ?? ''} ${str(raw.workplaceType) ?? ''}`),
        eligibility: null,
        skills: [],
        description,
        // Lever exposes no deadline field at all. Null is the honest answer;
        // inventing one here would be the exact failure verify.ts guards.
        deadline: null,
        postedAt: isoDay(raw.createdAt),
        compensation: compensationFrom(description),
      },
    ];
  });
}

/** Ashby: `{ jobs: [{ title, location, jobUrl, descriptionPlain, ... }] }` */
function readAshby(payload: unknown, board: AtsBoard): OpportunityCandidate[] {
  if (!isRecord(payload) || !Array.isArray(payload.jobs)) return [];

  return payload.jobs.flatMap((raw): OpportunityCandidate[] => {
    if (!isRecord(raw)) return [];
    // `isListed: false` is a posting the employer has taken off its own board.
    if (raw.isListed === false) return [];

    const title = str(raw.title);
    const applyUrl = str(raw.jobUrl) ?? str(raw.applyUrl);
    if (!title || !applyUrl) return [];

    const description = plain(str(raw.descriptionPlain) ?? str(raw.descriptionHtml));

    return [
      {
        title,
        organization: board.name,
        kind: kindOf(title, str(raw.employmentType)),
        applyUrl,
        sourceUrl: applyUrl,
        location: str(raw.location),
        workMode: workModeOf(str(raw.workplaceType), raw.isRemote === true),
        eligibility: null,
        skills: [],
        description,
        deadline: null,
        postedAt: isoDay(raw.publishedAt),
        compensation: compensationFrom(description),
      },
    ];
  });
}

/** SmartRecruiters: `{ content: [{ name, ref, location:{city,country}, ... }] }` */
function readSmartRecruiters(payload: unknown, board: AtsBoard): OpportunityCandidate[] {
  if (!isRecord(payload) || !Array.isArray(payload.content)) return [];

  return payload.content.flatMap((raw): OpportunityCandidate[] => {
    if (!isRecord(raw)) return [];
    const title = str(raw.name);
    const id = str(raw.id);
    if (!title || !id) return [];

    const location = isRecord(raw.location)
      ? [str(raw.location.city), str(raw.location.country)].filter(Boolean).join(', ')
      : null;

    return [
      {
        title,
        organization: isRecord(raw.company) ? (str(raw.company.name) ?? board.name) : board.name,
        kind: kindOf(title, isRecord(raw.typeOfEmployment) ? str(raw.typeOfEmployment.label) : null),
        // The public posting URL is derivable from the company slug and id;
        // `ref` is an API address and would 404 in a browser.
        applyUrl: `https://jobs.smartrecruiters.com/${board.slug}/${id}`,
        sourceUrl: `https://jobs.smartrecruiters.com/${board.slug}/${id}`,
        location: location || null,
        workMode: workModeOf(location),
        eligibility: null,
        skills: [],
        description: null,
        deadline: null,
        postedAt: isoDay(raw.releasedDate),
        compensation: null,
      },
    ];
  });
}

// ---------------------------------------------------------------------------
// Harvest
// ---------------------------------------------------------------------------

const ENDPOINTS: Record<AtsVendor, (slug: string) => string> = {
  greenhouse: (slug) => `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
  lever: (slug) => `https://api.lever.co/v0/postings/${slug}?mode=json`,
  ashby: (slug) => `https://api.ashbyhq.com/posting-api/job-board/${slug}`,
  smartrecruiters: (slug) => `https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=100`,
};

const READERS: Record<AtsVendor, (payload: unknown, board: AtsBoard) => OpportunityCandidate[]> = {
  greenhouse: readGreenhouse,
  lever: readLever,
  ashby: readAshby,
  smartrecruiters: readSmartRecruiters,
};

/** One board's contribution to a run, for the sources panel and run ledger. */
export interface BoardResult {
  board: AtsBoard;
  candidates: OpportunityCandidate[];
  /** Set when the board could not be read. Never throws — a 404 is data. */
  error: string | null;
}

export async function harvestBoard(board: AtsBoard): Promise<BoardResult> {
  const payload = await getJson(ENDPOINTS[board.vendor](board.slug));
  if (payload === null) {
    return { board, candidates: [], error: 'board unreachable or returned a non-JSON body' };
  }

  try {
    return { board, candidates: READERS[board.vendor](payload, board), error: null };
  } catch (error) {
    return { board, candidates: [], error: (error as Error).message };
  }
}

/** Run `worker` over `items`, at most `size` in flight, stopping at `deadline`. */
async function inBatches<T, R>(
  items: readonly T[],
  size: number,
  worker: (item: T) => Promise<R>,
  deadline?: number
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    if (deadline && Date.now() > deadline) break;
    out.push(...(await Promise.all(items.slice(i, i + size).map(worker))));
  }
  return out;
}

export interface HarvestSummary {
  candidates: OpportunityCandidate[];
  results: BoardResult[];
  boardsPolled: number;
  boardsFailed: number;
}

/**
 * Poll every board and return everything they published.
 *
 * Deliberately does no filtering beyond what each vendor's reader needs to
 * build a candidate. Selection is verify.ts's job and doing it twice, in two
 * places, is how the two copies drift apart.
 */
export async function harvestAts(
  options: { boards?: readonly AtsBoard[]; deadline?: number; concurrency?: number } = {}
): Promise<HarvestSummary> {
  const boards = options.boards ?? ATS_BOARDS;
  // Eight at a time across four different vendors is polite per-host and still
  // clears the whole registry well inside a serverless invocation.
  const results = await inBatches(boards, options.concurrency ?? 8, harvestBoard, options.deadline);

  return {
    candidates: results.flatMap((result) => result.candidates),
    results,
    boardsPolled: results.length,
    boardsFailed: results.filter((result) => result.error !== null).length,
  };
}

// Exported for tests. The readers are pure functions of a parsed response body,
// which is the whole reason the network lives in getJson() and not in them.
export const __internal = {
  readGreenhouse,
  readLever,
  readAshby,
  readSmartRecruiters,
  kindOf,
  workModeOf,
  compensationFrom,
  plain,
  isoDay,
};
