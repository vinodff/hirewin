/**
 * Is this a DIRECT application link?
 *
 * The gap this closes: every other check in the pipeline asks whether a posting
 * is real, relevant and reachable. None of them asks whether the link goes to
 * the posting. A careers homepage passes the trust registry (it is the
 * employer's own domain), passes liveness (it returns 200 forever), and passes
 * the region and seniority gates (it inherits whatever the extractor guessed).
 * It then renders a card saying "Apply now" that drops the reader on a search
 * box with no idea what they were meant to apply to.
 *
 * That is worse than a dead link, because a dead link is obvious and this is
 * not. So a non-direct URL holds the row at `pending` for a human rather than
 * publishing it — see verifyCandidate.
 *
 * The rule is structural, not a fetch: a direct posting URL carries an
 * IDENTIFIER for one posting. Every applicant tracking system does this, and
 * the shapes are well known:
 *
 *   greenhouse  /example/jobs/4731043005        numeric id
 *   lever       /example/8f2c-…-b7e1            uuid
 *   ashby       /example/d3bc1ced-…             uuid
 *   workday     /job/Bengaluru/Intern_R-12345   R-number
 *
 * An index page carries no identifier: /careers, /jobs, /openings?team=eng.
 */

/** Path segments that name a listing surface rather than a listing. */
const INDEX_SEGMENTS = new Set([
  'careers',
  'career',
  'jobs',
  'job',
  'openings',
  'opening',
  'positions',
  'vacancies',
  'roles',
  'search',
  'joinus',
  'join-us',
  'work-with-us',
  'opportunities',
  'hiring',
  'apply',
  'en',
  'us',
  'in',
  'index',
]);

/**
 * Query keys that mean "this is a filtered list".
 *
 * Deliberately excludes the id-bearing ones some boards use — `gh_jid`,
 * `jobId`, `postingId` — which point AT a posting and are handled below.
 */
const SEARCH_PARAMS = ['q', 'query', 'search', 'keyword', 'keywords', 'department', 'team', 'location', 'category'];

/** Query keys that carry a specific posting id, making an otherwise bare path direct. */
const ID_PARAMS = ['gh_jid', 'jobid', 'job_id', 'postingid', 'posting_id', 'id', 'reqid', 'req_id', 'jid'];

/**
 * Segments after which a bare number is a page, not a posting.
 *
 * This is why the numeric rule below has no minimum digit count. A floor of
 * three digits looked like a cheap way to exclude "/careers/en/2", but it also
 * excluded `devpost.com/h/1` and `/jobs/1` — real posting URLs whose ids simply
 * happen to be short. What actually distinguishes them is the segment BEFORE
 * the number: "jobs" and "h" say the number identifies a posting, "en" and
 * "page" say it identifies a page of a list.
 */
const PAGINATION_CONTEXT = new Set(['page', 'p', 'pg', 'en', 'us', 'in', 'uk', 'index', 'list']);

/** A numeric id, a uuid, an R-number, or a slug with enough words to be a title. */
function looksLikeIdentifier(segment: string, previous?: string): boolean {
  const value = segment.toLowerCase();

  // Numeric ids: 4731043005, 12345, and the short ones some boards still use.
  if (/^\d+$/.test(value)) {
    return !(previous !== undefined && PAGINATION_CONTEXT.has(previous.toLowerCase()));
  }

  // UUIDs, with or without dashes.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)) return true;
  if (/^[0-9a-f]{24,}$/.test(value)) return true;

  // Requisition numbers: R-12345, JR0098765, REQ_4471.
  if (/^(r|jr|req|jobreq)[-_]?\d{3,}$/.test(value)) return true;

  // A slug that embeds an id: senior-backend-engineer-4731043005, intern_R-1234.
  if (/[-_]\d{3,}$/.test(value)) return true;

  // A descriptive slug: "software-engineering-intern-bengaluru". Four or more
  // hyphenated words is a job title; "about-us" is not.
  if (value.split('-').filter(Boolean).length >= 4) return true;

  return false;
}

export interface ApplyLinkVerdict {
  direct: boolean;
  /** Why, in words. Stored on the row and shown in the admin console. */
  reason: string;
}

export function inspectApplyUrl(raw: string): ApplyLinkVerdict {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { direct: false, reason: 'not a valid URL' };
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return { direct: false, reason: 'not an http(s) URL' };
  }

  const params = new Map(
    [...url.searchParams.entries()].map(([key, value]) => [key.toLowerCase(), value])
  );

  // An id in the query makes even a bare path specific: Stripe's board links
  // are literally /jobs/search?gh_jid=8172508, which is a direct posting.
  for (const key of ID_PARAMS) {
    const value = params.get(key);
    if (value && /\w{3,}/.test(value)) {
      return { direct: true, reason: `posting id in ?${key}` };
    }
  }

  const segments = url.pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { direct: false, reason: 'links to a site root, not a posting' };
  }

  // A filter query with no posting id is a search results page by definition.
  const searchKey = SEARCH_PARAMS.find((key) => params.has(key));
  if (searchKey) {
    return { direct: false, reason: `links to a filtered list (?${searchKey}=)` };
  }

  const last = segments[segments.length - 1].toLowerCase();

  /*
   * Identifiers are looked for BEFORE index words, not after.
   *
   * The obvious order — reject index words first — gets `/jobs/4731043005/apply`
   * wrong, rejecting it because it ends in "apply". That URL is the most direct
   * link there is: it goes straight to the form for one posting. An index word
   * only means "listing surface" when nothing else in the path identifies a
   * posting, so the identifier check has to run first.
   */
  const previous = segments.length >= 2 ? segments[segments.length - 2] : undefined;

  if (looksLikeIdentifier(last, previous)) {
    return { direct: true, reason: 'path ends in a posting identifier' };
  }

  // Some boards put the id second-to-last: /jobs/4731043005/apply.
  if (
    previous !== undefined &&
    looksLikeIdentifier(previous, segments.length >= 3 ? segments[segments.length - 3] : undefined)
  ) {
    return { direct: true, reason: 'path carries a posting identifier' };
  }

  // No identifier anywhere, and it ends on a listing surface: the classic
  // careers-homepage case.
  if (INDEX_SEGMENTS.has(last)) {
    return { direct: false, reason: `links to the "${last}" index, not one posting` };
  }

  return {
    direct: false,
    reason: 'no posting identifier in the URL — may be a listing page',
  };
}

/** Convenience for callers that only need the boolean. */
export function isDirectApplyUrl(raw: string): boolean {
  return inspectApplyUrl(raw).direct;
}
