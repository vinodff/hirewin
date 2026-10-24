/**
 * Shared contract for the local auto-apply engine.
 *
 * The engine runs on the owner's own PC (never on Vercel): one persistent,
 * logged-in Chrome profile, several tabs at once, one job per tab. Every
 * module under lib/apply/ builds against these types so the Naukri applier,
 * the external-ATS adapters, the answer engine and the runner can be written
 * independently and still fit.
 *
 * The rule every module follows: a status is a claim about the real world, so
 * it needs evidence. `applied` requires something Naukri or the ATS itself
 * returned (a 200 from the apply endpoint, a confirmation page). Anything the
 * engine cannot prove becomes `needs_review`, never `applied`.
 */
import type { Page } from 'playwright';
import type { RealApplicantVault } from '@/lib/naukri/profile-vault';

// ── Outcome ────────────────────────────────────────────────────────────────

export type ApplyStatus =
  /** Proven submitted. `evidence` says how. */
  | 'applied'
  /** Naukri or the ATS says this account already applied. */
  | 'already_applied'
  /** Filled as far as possible but NOT submitted; a person must finish it. */
  | 'needs_review'
  /** The browser profile is not signed in to Naukri. */
  | 'requires_login'
  /** Naukri's daily apply quota is used up. */
  | 'quota_exceeded'
  /** A captcha or OTP challenge blocked submission. */
  | 'captcha'
  /** External career site the engine has no adapter for; left for the user. */
  | 'external_unsupported'
  /** Job closed, expired, or no apply control on the page. */
  | 'unavailable'
  /** Something threw. `message` and the log say what. */
  | 'error';

export type AnswerSource =
  /** Taken directly from a profile field (name, email, CTC, notice period...). */
  | 'profile'
  /** Reused from an earlier identical question in the local answer cache. */
  | 'cache'
  /** Chosen by the AI router from the profile and resume. */
  | 'ai'
  /** Deliberately left unanswered (sensitive, or no honest basis). */
  | 'none';

// ── Forms ──────────────────────────────────────────────────────────────────

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'number'
  | 'email'
  | 'tel'
  | 'url'
  | 'date'
  | 'select'
  | 'combobox'
  | 'radio'
  | 'checkbox'
  | 'file';

export interface FieldOption {
  /** Visible text, as shown to a person. */
  label: string;
  /** Underlying value to set; equals label when the form has no separate value. */
  value: string;
}

/** One question on a form, independent of which site it came from. */
export interface FormQuestion {
  /** Stable within one form (DOM id, name, or Naukri questionId). */
  id: string;
  /** The question text a person would read. Trimmed, max 500 chars. */
  label: string;
  kind: FieldKind;
  /** Empty for free-text kinds. */
  options: FieldOption[];
  required: boolean;
  maxLength?: number;
  /** For checkbox groups: whether more than one option may be chosen. */
  multiple?: boolean;
}

export interface Answer {
  questionId: string;
  /** Copied from the question, so a log line is readable on its own. */
  label: string;
  /**
   * What will be entered. A string for text/select/radio, string[] for
   * multi-select checkboxes, null when deliberately left blank. For choice
   * kinds this MUST be one of the question's option values.
   *
   * Two kinds have no options to choose from:
   *  - a single checkbox (e.g. a consent box): 'true' = tick it, 'false' = leave it unticked;
   *  - a file input: the absolute path of the file to upload (the resume PDF).
   */
  value: string | string[] | null;
  source: AnswerSource;
  /** 0-100. Profile answers are 100; AI answers carry the model's own figure. */
  confidence: number;
  /** One short sentence: why this answer. Shown to the user in the run log. */
  reason: string;
  /**
   * True for questions the engine must never answer on its own: demographic
   * self-identification (gender, caste, religion, disability, veteran status)
   * and legal attestations (criminal record, "I certify that..."). A sensitive
   * required question makes the job `needs_review` unless a "prefer not to
   * say" option exists and is chosen.
   */
  sensitive?: boolean;
}

// ── Profile ────────────────────────────────────────────────────────────────

/** The vault plus the extra facts external ATS forms routinely ask for. */
export interface ApplicantProfile extends RealApplicantVault {
  preferredLocations?: string[];
  willingToRelocate?: boolean;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  /** Absolute path to the resume PDF uploaded to ATS forms. */
  resumePdfPath?: string;
  /**
   * Countries the candidate is legally allowed to work in, e.g. ['India'].
   * Work-authorization questions are answered from this only; when it is
   * absent they are treated as sensitive and left for the user.
   */
  authorizedToWorkIn?: string[];
  /** Whether the candidate needs visa sponsorship. Absent = unknown = not answered. */
  requiresSponsorship?: boolean;
}

export interface JobContext {
  title: string;
  company: string;
  location?: string;
  /** Job description text when available; helps the AI answer screening questions. */
  description?: string;
}

export interface AnswerContext {
  profile: ApplicantProfile;
  job: JobContext;
}

/** Answers a batch of questions for one form. Never throws for a single bad question. */
export interface AnswerEngine {
  answer(questions: FormQuestion[], ctx: AnswerContext): Promise<Answer[]>;
}

// ── Logging ────────────────────────────────────────────────────────────────

export type LogLevel = 'info' | 'warn' | 'error';

export interface RunLogEntry {
  /** Epoch ms. */
  t: number;
  level: LogLevel;
  /** Short machine-ish step name: 'navigate', 'click-apply', 'apply-response', 'ats:greenhouse'... */
  step: string;
  msg: string;
  /** Small structured detail (HTTP status, URL, selector). Never secrets or cookies. */
  data?: Record<string, unknown>;
}

/** Per-job logger. Entries are persisted with the run so failures can be diagnosed from real data. */
export interface JobLogger {
  info(step: string, msg: string, data?: Record<string, unknown>): void;
  warn(step: string, msg: string, data?: Record<string, unknown>): void;
  error(step: string, msg: string, data?: Record<string, unknown>): void;
  /** Saves a screenshot of the page into the run folder; returns its file name, or null on failure. */
  screenshot(page: Page, label: string): Promise<string | null>;
  entries(): RunLogEntry[];
}

// ── Jobs and results ───────────────────────────────────────────────────────

export interface ApplyTarget {
  jobId: string;
  title: string;
  company: string;
  /** A naukri.com job URL. */
  jobUrl: string;
  location?: string;
  description?: string;
}

export interface JobApplyResult {
  jobId: string;
  title: string;
  company: string;
  jobUrl: string;
  status: ApplyStatus;
  /** One or two plain sentences for the user. */
  message: string;
  /** Every answer entered or deliberately withheld, with its source. */
  answers: Answer[];
  /** Human-readable proof for the status, e.g. 'apply-workflow HTTP 200, jobs[0].status=200'. */
  evidence: string[];
  /** Screenshot file names inside the run folder. */
  screenshots: string[];
  /** Where the job redirected, for external applications. */
  externalUrl?: string;
  /** 'greenhouse', 'lever', ... when an adapter handled it. */
  atsName?: string;
  startedAt: number;
  finishedAt: number;
}

/** Fields an adapter or applier fills in; the runner adds ids, timing and logs. */
export type ApplyOutcome = Pick<
  JobApplyResult,
  'status' | 'message' | 'answers' | 'evidence' | 'externalUrl' | 'atsName'
>;

// ── External ATS adapters ──────────────────────────────────────────────────

export interface AtsContext {
  profile: ApplicantProfile;
  job: JobContext;
  answers: AnswerEngine;
  log: JobLogger;
  /** When false, fill everything but stop before the final submit and return needs_review. */
  submit: boolean;
}

export interface AtsAdapter {
  /** Lowercase id: 'greenhouse', 'lever', 'ashby', 'smartrecruiters', 'workday', 'generic'. */
  name: string;
  matches(url: URL): boolean;
  /** The page is already on the application (or posting) URL. */
  apply(page: Page, ctx: AtsContext): Promise<ApplyOutcome>;
}

// ── Naukri applier ─────────────────────────────────────────────────────────

export interface NaukriApplyContext {
  profile: ApplicantProfile;
  target: ApplyTarget;
  answers: AnswerEngine;
  log: JobLogger;
  submit: boolean;
  /**
   * Called when the job sends the candidate to a company site. Receives the
   * page (or popup) already on the external URL; returns that site's outcome.
   */
  applyExternal(page: Page, externalUrl: string): Promise<ApplyOutcome>;
}
