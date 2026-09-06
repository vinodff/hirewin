
import type { SupabaseClient } from '@supabase/supabase-js';
import { OPPORTUNITY_KINDS, type OpportunityCandidate, type OpportunityKind } from './types';
import { classifyHost } from './sources';
import { canonicalizeUrl } from './verify';
import { ingestCandidates } from './ingest';
import { jobPostingNodes } from './liveness';
import type { RunSource } from './runs';

/**
 * Opportunity discovery by grounded web search — the SECOND of two channels.
 *
 * Ported from BVCITS 2.0. Search → fetch → extract → verify → dedupe → upsert,
 * with search running on Gemini's googleSearch grounding.
 *
 * Its role here is narrower than in the original. ats.ts covers jobs and
 * internships directly from applicant tracking systems — structured, free and
 * uncapped — so this channel is pointed at what has no API: hackathons,
 * competitions, scholarships, fellowships and campus programmes. See
 * SEARCH_PLANS below.
 *
 * The critical property that made the original work is preserved: an
 * unrestricted web search returns almost entirely SEO reposting sites (its own
 * comment records one publishable row out of forty pages), and scoping the
 * search to a registry of known hosts inverts that. The constraint is expressed
 * as Google `site:` operators inside the query, so the narrowing happens at the
 * search engine rather than as a filter afterwards.
 *
 * Sources are taken from `groundingMetadata.groundingChunks[].web.uri` —
 * server-verified citations of pages the search actually returned, not a list
 * the model was asked to self-report. That distinction is why the run ledger
 * can honestly record where each opportunity came from.
 *
 * GEMINI_API_KEY is OPTIONAL. Without it this channel reports itself skipped
 * and the run continues on ats.ts alone — a missing key costs the feed its
 * hackathons, not its existence.
 */

const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
/** Cheapest usable model first; the flash-preview tier is 20 requests/day. */
const MODEL_CHAIN = ['gemini-3.1-flash-lite', 'gemini-3-flash-preview'] as const;

const SEARCH_TIMEOUT_MS = 25_000;
const EXTRACT_TIMEOUT_MS = 20_000;
const FETCH_TIMEOUT_MS = 8_000;

/**
 * Wall-clock budget for the whole discovery half.
 *
 * The route runs under Vercel's `maxDuration = 300`, and the liveness sweep
 * still has to happen afterwards. Rather than hope the work fits, each stage
 * checks the clock and stops taking on more — a run that returns 30
 * opportunities and admits it ran out of time is far better than one that is
 * killed mid-flight and records nothing at all.
 */
const DISCOVERY_BUDGET_MS = 170_000;
const USER_AGENT = 'HireWin-OpportunityBot/1.0 (+https://hirewin.in)';

/**
 * Domains are grouped rather than listed flat.
 *
 * Google stops honouring a `site:` OR-chain after a handful of terms, so a
 * single query carrying thirteen hosts silently searches only the first few —
 * which is why the earlier version never once returned a result from Workday,
 * TCS or the Indian boards. Each group is searched as its own query instead, so
 * every host actually gets looked at.
 */

/** Indian student boards — the audience this feed actually serves. */
const INDIA_BOARD_GROUP = ['internshala.com', 'unstop.com', 'instahyre.com', 'cutshort.io'] as const;

/** Hackathon and programme organisers. */
const HACKATHON_GROUP = ['devpost.com', 'mlh.io', 'devfolio.co'] as const;
const HACKATHON_GROUP_2 = ['unstop.com', 'hackerearth.com', 'hack2skill.com', 'dorahacks.io'] as const;

/** Standing contest platforms — monthly rounds students can enter cold. */
const CONTEST_GROUP = ['codechef.com', 'hackerrank.com', 'kaggle.com', 'codeforces.com'] as const;

/** Scholarship and fellowship portals, mostly official Indian ones. */
const SCHOLARSHIP_GROUP = ['scholarships.gov.in', 'buddy4study.com', 'vidyasaarathi.co.in'] as const;
const GOV_SCHOLARSHIP_GROUP = ['scholarships.gov.in', 'aicte-india.org', 'ugc.gov.in'] as const;

/** Open-source and research programmes that take students directly. */
const OSS_PROGRAMME_GROUP = ['summerofcode.withgoogle.com', 'outreachy.org', 'developers.google.com'] as const;

interface SearchPlan {
  kind: OpportunityKind;
  /** Described the way a student would say it — the search engine matches meaning. */
  intent: string;
  domains?: readonly string[];
}

/**
 * What the search channel goes looking for each run.
 *
 * DELIBERATELY NARROWER than the BVCITS original, which carried twelve job and
 * internship plans. Those kinds now arrive through ats.ts — structured, exact,
 * free and uncapped — so spending a rate-limited model call to re-find on
 * Greenhouse what the Greenhouse API already handed over is pure waste. The
 * search budget belongs to what has no API at all.
 *
 * That is the whole reason this channel still exists. No hackathon platform,
 * scholarship portal or campus-ambassador programme publishes a job-board
 * endpoint, so grounded search remains the only way those reach the feed.
 *
 * India is written into the intent of every plan, not bolted on afterwards. An
 * unqualified query returns Santa Clara and Menlo Park because that is where
 * the highest-ranked postings are. The region gate in region.ts rejects those
 * anyway, so leaving "India" out of the query merely spends the budget fetching
 * pages that are then thrown away — the search has to want the right thing to
 * begin with.
 */
const SEARCH_PLANS: readonly SearchPlan[] = [
  // --- hackathons --------------------------------------------------------
  { kind: 'hackathon', intent: 'hackathon in India open for college student registration', domains: HACKATHON_GROUP },
  { kind: 'hackathon', intent: 'hackathon for Indian college students, registration open', domains: HACKATHON_GROUP_2 },
  { kind: 'hackathon', intent: 'online hackathon open worldwide to students, registration open now', domains: HACKATHON_GROUP },
  { kind: 'hackathon', intent: 'student hackathon with prizes accepting registrations', domains: HACKATHON_GROUP_2 },
  { kind: 'hackathon', intent: 'AI or machine learning hackathon for students, apply now', domains: HACKATHON_GROUP },

  // --- competitions ------------------------------------------------------
  { kind: 'competition', intent: 'coding competition for engineering students in India, entries open', domains: HACKATHON_GROUP_2 },
  { kind: 'competition', intent: 'national level technical competition for Indian engineering students', domains: HACKATHON_GROUP },
  { kind: 'competition', intent: 'online programming contest open to students', domains: CONTEST_GROUP },
  { kind: 'competition', intent: 'innovation or case study challenge for Indian college students', domains: HACKATHON_GROUP_2 },

  // --- scholarships ------------------------------------------------------
  { kind: 'scholarship', intent: 'engineering scholarship for Indian undergraduate students, application open', domains: SCHOLARSHIP_GROUP },
  { kind: 'scholarship', intent: 'merit scholarship for engineering students in India, apply online', domains: SCHOLARSHIP_GROUP },
  { kind: 'scholarship', intent: 'government scholarship for engineering students in India, official portal', domains: GOV_SCHOLARSHIP_GROUP },
  { kind: 'scholarship', intent: 'scholarship for girl students in engineering in India, applications open' },

  // --- fellowships and open-source programmes ----------------------------
  { kind: 'fellowship', intent: 'student fellowship or research programme in India accepting applications' },
  { kind: 'fellowship', intent: 'open source contribution programme for students, applications open', domains: OSS_PROGRAMME_GROUP },

  // --- campus programmes -------------------------------------------------
  { kind: 'ambassador', intent: 'campus ambassador programme for Indian college students, apply now' },

  /*
   * Internships are kept to a single plan, not dropped entirely.
   *
   * ats.ts only knows the boards in its registry. This one query is the
   * discovery channel for employers not yet in it — anything it surfaces on an
   * unrecognised domain stays `pending` rather than reaching the page, so the
   * cost of it being wrong is a review queue entry rather than a bad listing.
   */
  { kind: 'internship', intent: 'internship for engineering students in India, apply online', domains: INDIA_BOARD_GROUP },
];
// ---------------------------------------------------------------------------
// Stage 1 — search
// ---------------------------------------------------------------------------

interface FoundPage {
  url: string;
  title: string;
  kind: OpportunityKind;
  /** Which plan surfaced it, for the sources panel. */
  plan: string;
}

interface GroundingChunk {
  web?: { uri?: string; title?: string };
}

function buildQuery(plan: SearchPlan): string {
  if (!plan.domains?.length) return `${plan.intent} 2026`;
  // Google caps how much a single query can carry, and an OR chain of 13 site:
  // filters starts being ignored. Six is comfortably under that and still
  // covers the highest-yield hosts for the plan.
  const sites = plan.domains.slice(0, 6).map((d) => `site:${d}`).join(' OR ');
  return `(${sites}) ${plan.intent}`;
}

/** One grounded search. Returns the pages the search engine actually cited. */
async function searchPlan(plan: SearchPlan, apiKey: string): Promise<FoundPage[]> {
  const query = buildQuery(plan);
  const prompt = [
    `Search the web for: ${query}`,
    '',
    'List the specific opportunity pages you find. For each, give the exact page',
    'URL and its title. Only list pages for ONE specific opportunity — not',
    'category pages, search results, or articles about opportunities.',
    'Prefer listings that are currently open.',
  ].join('\n');

  for (const model of MODEL_CHAIN) {
    try {
      const response = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          // The search tool is what makes this real. Note it is NOT combined
          // with responseMimeType: 'application/json' — the placement search
          // module records that pairing googleSearch with strict JSON mode
          // silently returns empty responses on this endpoint.
          tools: [{ googleSearch: {} }],
          generationConfig: { temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(SEARCH_TIMEOUT_MS),
      });

      if (response.status === 429) continue; // next model in the chain
      if (!response.ok) {
        console.warn(`[opportunity-discover] ${model} search ${response.status}`);
        continue;
      }

      const payload = (await response.json()) as {
        candidates?: { groundingMetadata?: { groundingChunks?: GroundingChunk[] } }[];
      };
      const chunks = payload.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

      return chunks
        .map((chunk) => chunk.web)
        .filter((web): web is { uri: string; title?: string } => Boolean(web?.uri))
        .map((web) => ({
          url: web.uri,
          title: web.title ?? '',
          kind: plan.kind,
          plan: plan.kind,
        }));
    } catch (error) {
      console.warn(
        `[opportunity-discover] ${model} search failed:`,
        error instanceof Error ? error.message : error
      );
    }
  }
  return [];
}

const REDIRECT_HOST = /vertexaisearch\.cloud\.google\.com|grounding-api-redirect/;

/**
 * Grounding citations arrive as Vertex redirect URLs, which are useless as an
 * apply link and unusable for domain classification. Follow one hop to recover
 * the publisher's real URL.
 *
 * Returns null when the hop fails, and the caller drops the page. Returning the
 * redirect unchanged — as this did — was quietly wrong twice over: the stored
 * apply link was a short-lived Vertex URL that would 404 for the student, and
 * `vertexaisearch.cloud.google.com` ends in `.google.com`, so the trust registry
 * classified whatever lay behind it as an OFFICIAL Google posting. A live run
 * published two rows that way. An unresolvable citation has no identifiable
 * publisher, and unidentified is precisely what this pipeline must not publish.
 */
async function resolveRedirect(url: string): Promise<string | null> {
  if (!REDIRECT_HOST.test(url)) return url;
  try {
    const response = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const resolved = response.url;
    return resolved && !REDIRECT_HOST.test(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Stage 2 — fetch the page
// ---------------------------------------------------------------------------

/** Strip markup so the extractor reads copy rather than tags. */
function pageText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface FetchedPage extends FoundPage {
  text: string;
  /** JSON-LD JobPosting, when the page publishes one. */
  jobPosting: Record<string, unknown> | null;
}

/** Below this there is nothing worth asking a model to read. */
const MIN_TEXT = 200;

async function fetchPage(page: FoundPage): Promise<FetchedPage | null> {
  try {
    const response = await fetch(page.url, {
      method: 'GET',
      redirect: 'follow',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const html = (await response.text()).slice(0, 300_000);
    const jobPosting = jobPostingNodes(html)[0] ?? null;
    const text = pageText(html);

    // A client-rendered board has almost no visible text, but usually still
    // ships JSON-LD for Google. Keeping the page when EITHER is present is what
    // recovers Greenhouse, Lever and Ashby listings that were previously
    // dropped as 'too thin' — which was most of what the search actually found.
    if (text.length < MIN_TEXT && !jobPosting) return null;

    return { ...page, text: text.slice(0, 4000), jobPosting };
  } catch {
    return null;
  }
}

/** Read a plain string out of a JSON-LD value that may be nested or an array. */
function ldString(value: unknown): string | null {
  if (typeof value === 'string') return value.trim() || null;
  if (Array.isArray(value)) return ldString(value[0]);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return ldString(record.name ?? record.value ?? record['@value']);
  }
  return null;
}

/** Strip the HTML that JobPosting.description is allowed to contain. */
function ldDescription(value: unknown): string | null {
  const raw = ldString(value);
  if (!raw) return null;
  const clean = pageText(raw);
  return clean ? clean.slice(0, 400) : null;
}

/**
 * Country names for the ISO codes schema.org postings actually use.
 *
 * `addressCountry` is specified as an ISO 3166-1 code and most publishers
 * comply, so a real posting reaches us as 'Bengaluru, Karnataka, IN'. The
 * region gate reads free text and cannot match a bare code — and it must not
 * try, because a case-insensitive `\bIN\b` over a job description would match
 * the English preposition on virtually every page. Expanding it here is safe
 * precisely because this field is known to be a country.
 */
const COUNTRY_NAMES: Record<string, string> = {
  IN: 'India',
  IND: 'India',
  US: 'United States',
  USA: 'United States',
  GB: 'United Kingdom',
  UK: 'United Kingdom',
  CA: 'Canada',
  DE: 'Germany',
  FR: 'France',
  NL: 'Netherlands',
  IE: 'Ireland',
  SG: 'Singapore',
  AU: 'Australia',
  JP: 'Japan',
  IL: 'Israel',
  PL: 'Poland',
  CH: 'Switzerland',
  SE: 'Sweden',
  AE: 'United Arab Emirates',
};

function expandCountry(value: string): string {
  return COUNTRY_NAMES[value.trim().toUpperCase()] ?? value;
}

function ldLocation(node: Record<string, unknown>): string | null {
  const loc = node.jobLocation;
  const first = Array.isArray(loc) ? loc[0] : loc;
  if (!first || typeof first !== 'object') return ldString(loc);
  const address = (first as Record<string, unknown>).address;
  if (!address || typeof address !== 'object') return ldString(first);
  const a = address as Record<string, unknown>;
  const country = ldString(a.addressCountry);
  const parts = [ldString(a.addressLocality), ldString(a.addressRegion), country ? expandCountry(country) : null]
    .filter((p): p is string => Boolean(p));
  return parts.length ? parts.join(', ') : null;
}

/**
 * Build a candidate straight from JSON-LD, with no model involved.
 *
 * This is strictly better than asking a model to read stripped markup: the
 * publisher stated these fields, so nothing can be paraphrased, inferred or
 * invented. `validThrough` in particular becomes a deadline we can trust,
 * which is the one field a student actually acts on.
 */
export function fromJobPosting(
  node: Record<string, unknown>,
  page: FoundPage
): Extracted | null {
  const title = ldString(node.title) ?? ldString(node.name);
  const organization = ldString(node.hiringOrganization);
  if (!title || !organization) return null;

  const validThrough = ldString(node.validThrough);
  const datePosted = ldString(node.datePosted);
  const isoDay = (value: string | null): string | undefined => {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
  };

  const employment = ldString(node.employmentType)?.toUpperCase() ?? '';
  const looksLikeInternship = /INTERN/.test(employment) || /intern/i.test(title);

  return {
    isOpportunity: true,
    title,
    organization,
    kind: looksLikeInternship ? 'internship' : page.kind === 'internship' ? 'internship' : 'job',
    location: ldLocation(node) ?? undefined,
    description: ldDescription(node.description) ?? undefined,
    deadline: isoDay(validThrough),
    postedAt: isoDay(datePosted),
  };
}

// ---------------------------------------------------------------------------
// Stage 3 — extract structured fields
// ---------------------------------------------------------------------------

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    isOpportunity: { type: 'boolean' },
    title: { type: 'string' },
    organization: { type: 'string' },
    kind: { type: 'string', enum: [...OPPORTUNITY_KINDS] },
    location: { type: 'string' },
    workMode: { type: 'string', enum: ['onsite', 'remote', 'hybrid'] },
    eligibility: { type: 'string' },
    skills: { type: 'array', items: { type: 'string' } },
    description: { type: 'string' },
    deadline: { type: 'string' },
    postedAt: { type: 'string' },
    compensation: { type: 'string' },
  },
  required: ['isOpportunity'],
};

interface Extracted {
  isOpportunity: boolean;
  title?: string;
  organization?: string;
  kind?: string;
  location?: string;
  workMode?: string;
  eligibility?: string;
  skills?: string[];
  description?: string;
  deadline?: string;
  postedAt?: string;
  compensation?: string;
}

/**
 * Two constraints are load-bearing and must not be relaxed:
 *
 *   1. The model never supplies a URL. The apply link is always the page that
 *      was actually fetched, so a hallucinated address cannot reach a student.
 *   2. A deadline must appear verbatim on the page. An invented deadline on an
 *      opportunity board is worse than no deadline — it is the one field a
 *      student acts on.
 */
function extractionPrompt(page: FetchedPage, today: string): string {
  return [
    'You are extracting structured data from a web page for a student opportunity board.',
    '',
    'Set isOpportunity to false — and return nothing else — if the page is:',
    '  - a list, index, category or search-results page rather than ONE specific opportunity',
    '  - a news article, blog post or guide ABOUT opportunities',
    '  - an opportunity that has already closed',
    '',
    'If it IS one specific opportunity, fill the fields from the page text only.',
    '',
    'RULES:',
    `  - today's date is ${today}. Resolve relative dates ('closes in two weeks') against it.`,
    '  - deadline must be YYYY-MM-DD and must be stated on the page. If the page does not',
    '    state a deadline, OMIT the field. Never estimate or guess one.',
    '  - organization is the employer or organiser, not the website hosting the page.',
    // The region gate reads this field. A posting that states a city but no
    // country reads as location-less downstream and is held back from students
    // rather than published, so the country is worth asking for explicitly.
    '  - location: city and country exactly as stated, e.g. "Bengaluru, India". If the page',
    '    gives only a city, still name the country. If it is remote or online, say so. Omit',
    '    the field only when the page genuinely states no location at all.',
    '  - skills: at most 8 short lowercase technology or subject terms.',
    '  - compensation: the stipend, salary or prize EXACTLY as printed, e.g. "Rs.50,000/month"',
    '    or "$5,000 prize pool". Omit the field unless a figure appears on the page. Never',
    '    convert currencies, annualise a monthly figure, or estimate a range.',
    '  - description: one or two factual sentences. No marketing language.',
    '  - Do not output any URL.',
    '',
    `PAGE URL: ${page.url}`,
    `PAGE TITLE: ${page.title}`,
    'PAGE TEXT:',
    page.text,
  ].join('\n');
}

async function extract(page: FetchedPage, today: string, apiKey: string): Promise<Extracted | null> {
  for (const model of MODEL_CHAIN) {
    try {
      const response = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: extractionPrompt(page, today) }] }],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 800,
            responseMimeType: 'application/json',
            responseSchema: EXTRACTION_SCHEMA,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        signal: AbortSignal.timeout(EXTRACT_TIMEOUT_MS),
      });

      if (response.status === 429) continue;
      if (!response.ok) return null;

      const payload = (await response.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const raw = (payload.candidates?.[0]?.content?.parts ?? [])
        .map((part) => part.text ?? '')
        .join('')
        .trim();
      if (!raw) return null;

      return JSON.parse(raw) as Extracted;
    } catch {
      // Malformed JSON or a transport failure: try the next model, then give up.
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export interface DiscoverySummary {
  pagesSearched: number;
  extracted: number;
  verified: number;
  pending: number;
  rejected: number;
  duplicates: number;
  sources: RunSource[];
  /** Titles that reached the feed, for the run report. */
  added: { title: string; organization: string; host: string; status: string }[];
  model: string;
  /** Set when the channel did not run at all. Null means it did. */
  skipped?: string;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
}

function asKind(value: unknown, fallback: OpportunityKind): OpportunityKind {
  return typeof value === 'string' && (OPPORTUNITY_KINDS as readonly string[]).includes(value)
    ? (value as OpportunityKind)
    : fallback;
}

/**
 * Run `worker` over `items`, at most `size` in flight, stopping early once
 * `deadline` passes. Returning what has been gathered so far beats throwing
 * away a batch's work because the next one would have overrun.
 */
async function inBatches<T, R>(
  items: T[],
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

/**
 * Take one item per group, then a second from each, and so on.
 *
 * Search results arrive grouped by plan, so any straight `slice` off the front
 * spends the entire budget on whichever plans happen to run first. With the
 * internship and job plans listed first that meant the fetch budget was
 * exhausted before a single hackathon or scholarship URL was reached — the
 * queries for those kinds ran every night and their results were then thrown
 * away unread. Round-robin makes the cap cost every kind its tail results
 * rather than costing some kinds everything.
 */
function interleave<T>(items: T[], groupOf: (item: T) => string): T[] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const key = groupOf(item);
    const bucket = groups.get(key);
    if (bucket) bucket.push(item);
    else groups.set(key, [item]);
  }

  const out: T[] = [];
  const buckets = [...groups.values()];
  const deepest = Math.max(0, ...buckets.map((b) => b.length));
  for (let rank = 0; rank < deepest; rank += 1) {
    for (const bucket of buckets) {
      if (rank < bucket.length) out.push(bucket[rank]);
    }
  }
  return out;
}

/**
 * Pages fetched per run. Bounded so one invocation cannot run out of clock,
 * but high enough to be worth calling research: JSON-LD extraction costs no
 * model call, so most of these pages are nearly free. `inBatches` stops on the
 * deadline regardless, so this is a ceiling rather than a promise.
 */
const MAX_PAGES = 120;

/**
 * Pages sent to the model per run.
 *
 * The one stage that costs seconds each, so it is what gets cut first. It
 * matters more than it looks: Indian sites publish no JSON-LD at all (probed
 * across internshala, unstop, devfolio, hackerearth, cutshort, wipro and
 * buddy4study — zero of them emit it), so Indian results reach the board only
 * through this path while ATS pages take the free structured one.
 */
const MAX_MODEL_EXTRACTIONS = 30;

export async function runDiscovery(
  supabase: SupabaseClient,
  options: { runId?: string; now?: Date } = {}
): Promise<DiscoverySummary> {
  const apiKey = process.env.GEMINI_API_KEY;

  const now = options.now ?? new Date();
  const today = now.toISOString().slice(0, 10);

  const empty: DiscoverySummary = {
    pagesSearched: 0,
    extracted: 0,
    verified: 0,
    pending: 0,
    rejected: 0,
    duplicates: 0,
    sources: [],
    added: [],
    model: MODEL_CHAIN[0],
  };

  // No key is a supported configuration, not a failure. ats.ts needs none, so
  // a run without one still fills the feed with jobs and internships — it just
  // discovers no hackathons. Throwing here would take the whole run down with
  // it for the sake of the channel that matters least.
  if (!apiKey) return { ...empty, skipped: 'GEMINI_API_KEY is not set' };

  const deadline = now.getTime() + DISCOVERY_BUDGET_MS;

  // --- search every plan -------------------------------------------------
  // Searches are independent network calls, so they parallelise cleanly; at 2
  // at a time the plan list alone took longer than the whole function budget.
  const searched = await inBatches([...SEARCH_PLANS], 7, (plan) => searchPlan(plan, apiKey), deadline);
  const found = searched.flat();
  if (found.length === 0) return empty;

  // Resolve redirects, then drop duplicate URLs before spending any fetches.
  const resolvedRaw = await inBatches(
    found,
    10,
    async (page) => {
      const url = await resolveRedirect(page.url);
      return url ? { ...page, url } : null;
    },
    deadline
  );
  const resolved = resolvedRaw.filter((page): page is FoundPage => page !== null);

  const seenUrls = new Set<string>();
  const unique = resolved.filter((page) => {
    // Belt and braces: nothing carrying a grounding-redirect host may proceed,
    // whatever route it took to get here. See resolveRedirect.
    if (REDIRECT_HOST.test(page.url)) return false;
    const key = canonicalizeUrl(page.url) ?? page.url;
    if (seenUrls.has(key)) return false;
    seenUrls.add(key);
    // A blocked host (shortener, chat invite) is never worth a fetch.
    return classifyHost(hostOf(page.url)) !== 'blocked';
  });

  const sourceTally = new Map<string, RunSource>();
  for (const page of unique) {
    const host = hostOf(page.url);
    const entry = sourceTally.get(host) ?? { host, plan: page.plan, results: 0, kept: 0 };
    entry.results += 1;
    sourceTally.set(host, entry);
  }

  const pages = interleave(unique, (page) => page.plan).slice(0, MAX_PAGES);

  // --- fetch + extract ---------------------------------------------------
  const fetched = (await inBatches(pages, 14, fetchPage, deadline)).filter(
    (page): page is FetchedPage => page !== null
  );

  /*
   * JSON-LD first, the model only for what is left.
   *
   * A page that publishes a JobPosting block has already stated its own title,
   * employer, location and expiry — reading them is exact, instant and free,
   * where asking a model to re-derive them from stripped markup is slower,
   * costs quota, and can paraphrase. On an ATS-heavy result set this is most of
   * the pages, which is what makes a 90-page run affordable at all.
   */
  const structured = fetched.filter((page) => page.jobPosting);
  const unstructured = fetched.filter((page) => !page.jobPosting);

  const extractions: { page: FetchedPage; data: Extracted | null }[] = structured.map((page) => ({
    page,
    data: fromJobPosting(page.jobPosting as Record<string, unknown>, page),
  }));

  // Only pages with real readable text are worth a model call, and only a
  // bounded number of them. Interleaved by kind for the same reason the fetch
  // budget is: the structured path is almost entirely foreign ATS pages, so
  // slicing this one in plan order would cut the Indian results specifically.
  const worthExtracting = interleave(
    unstructured.filter((page) => page.text.length >= MIN_TEXT),
    (page) => page.kind
  ).slice(0, MAX_MODEL_EXTRACTIONS);
  extractions.push(
    ...(await inBatches(
      worthExtracting,
      6,
      async (page) => ({ page, data: await extract(page, today, apiKey) }),
      deadline
    ))
  );

  // --- verify + dedupe ---------------------------------------------------
  //
  // Candidate construction is this channel's job; everything after it is not.
  // Verification, fingerprinting, the row shape and the upsert all live in
  // ingest.ts so that the ATS channel cannot end up with a different idea of
  // what "published" means.
  const summary: DiscoverySummary = { ...empty, pagesSearched: unique.length };

  const candidates: OpportunityCandidate[] = [];
  for (const { page, data } of extractions) {
    if (!data?.isOpportunity || !data.title || !data.organization) continue;
    summary.extracted += 1;

    candidates.push({
      title: data.title,
      organization: data.organization,
      kind: asKind(data.kind, page.kind),
      // Always the page actually fetched — the model never supplies a URL.
      applyUrl: page.url,
      sourceUrl: page.url,
      location: data.location ?? null,
      workMode:
        data.workMode === 'onsite' || data.workMode === 'remote' || data.workMode === 'hybrid'
          ? data.workMode
          : null,
      eligibility: data.eligibility ?? null,
      skills: Array.isArray(data.skills) ? data.skills.slice(0, 8) : [],
      description: data.description ?? null,
      deadline: data.deadline ?? null,
      postedAt: data.postedAt ?? null,
      compensation: data.compensation ?? null,
    });
  }

  const ingested = await ingestCandidates(supabase, candidates, {
    runId: options.runId,
    now,
    // Every page here was fetched successfully to get this far.
    reachability: 'ok',
  });

  summary.verified = ingested.verified;
  summary.pending = ingested.pending;
  summary.rejected = ingested.rejected;
  summary.duplicates = ingested.duplicates;
  summary.added = ingested.added;

  for (const [host, kept] of ingested.keptByHost) {
    const tally = sourceTally.get(host);
    if (tally) tally.kept += kept;
  }

  summary.sources = [...sourceTally.values()].sort((a, b) => b.results - a.results);

  return summary;
}
