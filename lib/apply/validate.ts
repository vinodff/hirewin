/**
 * Validates the body that starts a run.
 *
 * The body carries the identity and figures that get submitted to employers,
 * so it is parsed field by field into a fresh object rather than spread
 * through: unknown keys are dropped, every string is bounded, and anything
 * that would be sent as the candidate's own answer must actually be present.
 *
 * `submit` defaults to FALSE. A run only submits applications when the caller
 * says so explicitly; a malformed or partial request previews instead.
 */
import fs from 'fs';
import { checkJobUrl } from '@/lib/naukri/safety';
import { validateApplicantVault, type RealApplicantVault } from '@/lib/naukri/profile-vault';
import { MAX_CONCURRENCY, MAX_TARGETS } from './limits';
import type { ApplicantProfile, ApplyTarget } from './types';

export interface StartRequest {
  targets: ApplyTarget[];
  profile: ApplicantProfile;
  submit: boolean;
  concurrency?: number;
}

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string; details: string[] };

const NOTICE_PERIODS: ReadonlyArray<RealApplicantVault['noticePeriod']> = [
  'Immediate',
  '15 Days',
  '30 Days',
  '60 Days',
  '90 Days',
];

type Loose = Record<string, unknown>;

function isObject(v: unknown): v is Loose {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function str(v: unknown, max: number): string {
  return typeof v === 'string' ? v.trim().slice(0, max) : '';
}

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '') return Number(v);
  return Number.NaN;
}

function strList(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => str(item, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

function optionalBool(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined;
}

/** http(s) URL or undefined — a profile link is typed into forms and must be a real link. */
function optionalUrl(v: unknown): string | undefined {
  const raw = str(v, 300);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

function parseProfile(raw: unknown, env: NodeJS.ProcessEnv, errors: string[]): ApplicantProfile | null {
  if (!isObject(raw)) {
    errors.push('profile is required.');
    return null;
  }

  const noticePeriod = str(raw.noticePeriod, 20) as RealApplicantVault['noticePeriod'];
  if (!NOTICE_PERIODS.includes(noticePeriod)) {
    errors.push(`noticePeriod must be one of: ${NOTICE_PERIODS.join(', ')}.`);
  }

  const numbers = {
    totalExperienceYears: num(raw.totalExperienceYears),
    currentCtcLpa: num(raw.currentCtcLpa),
    expectedCtcLpa: num(raw.expectedCtcLpa),
  };
  for (const [key, value] of Object.entries(numbers)) {
    if (!Number.isFinite(value) || value < 0 || value > 1000) errors.push(`${key} must be a number from 0 to 1000.`);
  }
  if (Number.isFinite(numbers.expectedCtcLpa) && numbers.expectedCtcLpa === 0) {
    errors.push('expectedCtcLpa is required — it is sent to employers as your own figure.');
  }

  const graduationYear = num(raw.graduationYear);

  // Explicit path wins; otherwise the owner's configured resume. A path that
  // was given but does not exist is an error, not a silent "no resume".
  const pdfRaw = str(raw.resumePdfPath, 500) || str(env.HIREWIN_RESUME_PDF, 500);
  let resumePdfPath: string | undefined;
  if (pdfRaw) {
    if (!pdfRaw.toLowerCase().endsWith('.pdf') || !fs.existsSync(pdfRaw)) {
      errors.push(`resume PDF not found: ${pdfRaw}`);
    } else {
      resumePdfPath = pdfRaw;
    }
  }

  const profile: ApplicantProfile = {
    fullName: str(raw.fullName, 120),
    email: str(raw.email, 200),
    phone: str(raw.phone, 20),
    currentLocation: str(raw.currentLocation, 120),
    totalExperienceYears: numbers.totalExperienceYears,
    noticePeriod,
    currentCtcLpa: numbers.currentCtcLpa,
    expectedCtcLpa: numbers.expectedCtcLpa,
    highestDegree: str(raw.highestDegree, 120),
    specialization: str(raw.specialization, 120),
    collegeName: str(raw.collegeName, 200),
    graduationYear: Number.isFinite(graduationYear) ? Math.floor(graduationYear) : 0,
    skills: strList(raw.skills, 60, 60),
    resumeText: str(raw.resumeText, 30_000),
    resumePdfPath,
    preferredLocations: strList(raw.preferredLocations, 10, 120),
    willingToRelocate: optionalBool(raw.willingToRelocate),
    linkedinUrl: optionalUrl(raw.linkedinUrl),
    githubUrl: optionalUrl(raw.githubUrl),
    portfolioUrl: optionalUrl(raw.portfolioUrl),
    authorizedToWorkIn: strList(raw.authorizedToWorkIn, 10, 60),
    requiresSponsorship: optionalBool(raw.requiresSponsorship),
  };

  errors.push(...validateApplicantVault(profile).errors);
  return profile;
}

function parseTargets(raw: unknown, errors: string[]): ApplyTarget[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    errors.push('targets must be a non-empty list of jobs.');
    return [];
  }
  if (raw.length > MAX_TARGETS) {
    errors.push(`At most ${MAX_TARGETS} jobs per run.`);
    return [];
  }

  const seen = new Set<string>();
  const targets: ApplyTarget[] = [];
  raw.forEach((item, i) => {
    const n = i + 1;
    if (!isObject(item)) {
      errors.push(`job ${n}: not an object.`);
      return;
    }
    const target: ApplyTarget = {
      jobId: str(item.jobId, 100),
      title: str(item.title, 300),
      company: str(item.company, 200),
      jobUrl: str(item.jobUrl, 1000),
      location: str(item.location, 200) || undefined,
      description: str(item.description, 5000) || undefined,
    };
    if (!target.jobId) errors.push(`job ${n}: jobId is required.`);
    if (!target.title) errors.push(`job ${n}: title is required.`);
    if (!target.company) errors.push(`job ${n}: company is required.`);
    const url = checkJobUrl(target.jobUrl);
    if (!url.allowed) errors.push(`job ${n}: ${url.reason}`);
    if (target.jobId && seen.has(target.jobId)) errors.push(`job ${n}: duplicate jobId ${target.jobId}.`);
    seen.add(target.jobId);
    targets.push(target);
  });
  return targets;
}

export function parseStartRequest(body: unknown, env: NodeJS.ProcessEnv = process.env): Parsed<StartRequest> {
  if (!isObject(body)) return { ok: false, error: 'Request body must be a JSON object.', details: [] };

  const errors: string[] = [];
  const targets = parseTargets(body.targets, errors);
  const profile = parseProfile(body.profile, env, errors);

  let concurrency: number | undefined;
  if (body.concurrency !== undefined) {
    const c = num(body.concurrency);
    if (!Number.isInteger(c) || c < 1 || c > MAX_CONCURRENCY) {
      errors.push(`concurrency must be a whole number from 1 to ${MAX_CONCURRENCY}.`);
    } else {
      concurrency = c;
    }
  }

  if (errors.length > 0 || !profile) {
    return { ok: false, error: 'The auto-apply request is incomplete.', details: errors };
  }
  return { ok: true, value: { targets, profile, submit: body.submit === true, concurrency } };
}
