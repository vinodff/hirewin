/**
 * Public surface of the opportunities module.
 *
 * `lib/opportunities.ts` used to be the whole feature — a Google Sheet reader.
 * It is now `./sheet` and re-exported here unchanged, so every existing
 * importer of `@/lib/opportunities` keeps working exactly as before.
 */

// --- the hand-curated half (formerly lib/opportunities.ts) -----------------
export {
  getOpportunities,
  splitHighlight,
  SHEET_CSV_URL,
  __internal,
  type Opportunity,
  type OpportunityFeed,
  type Urgency,
} from './sheet';

// --- the merged public feed ------------------------------------------------
export { getMergedFeed, type MergedFeed } from './feed';

// --- the agent -------------------------------------------------------------
export * from './types';
export { classifyHost, TIER_WEIGHT } from './sources';
export { classifyRegion, regionVerdict, REGION_FITS, type RegionFit } from './region';
export {
  canonicalizeUrl,
  contentFingerprint,
  isDeadlineSane,
  isStudentLevel,
  urlFingerprint,
  verifyCandidate,
  type Reachability,
  type VerificationResult,
  type VerifyOptions,
} from './verify';
export {
  checkLiveness,
  judge,
  shouldRetire,
  nextFailureCount,
  extractValidThrough,
  findTombstone,
  jobPostingNodes,
  visibleText,
  FAILURE_LIMIT,
  type LivenessResult,
  type LivenessVerdict,
  type ProbeOutcome,
} from './liveness';
export {
  daysUntil,
  rankOpportunities,
  scoreOpportunity,
  type ScoreBreakdown,
  type ScoredOpportunity,
} from './score';
export { fromRow, OPPORTUNITY_COLUMNS } from './records';
export {
  ATS_BOARDS,
  harvestAts,
  harvestBoard,
  type AtsBoard,
  type AtsVendor,
  type BoardResult,
  type HarvestSummary,
} from './ats';
export { ingestCandidates, type IngestSummary, type IngestOptions } from './ingest';
